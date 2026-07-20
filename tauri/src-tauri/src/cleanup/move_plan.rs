use super::downloads::classify_file_type;
use super::migration::{
    ensure_movable_source, execute_desktop_recycle_plan, execute_move_plan, target_root_for_drive,
};
use super::model::{MovePlan, MovePlanItem, MoveResult};
use super::protect::{is_inside_root, is_sensitive_account_data};
use super::utils::{directory_size_filtered, generated_at, unique_id};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const RECENT_DESKTOP_FILE_AGE: Duration = Duration::from_secs(7 * 24 * 60 * 60);

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path)
        .map_err(|error| format!("无法读取所选文件 {}：{error}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("读取所选文件失败 {}：{error}", path.display()))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn unsafe_desktop_attributes(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const HIDDEN: u32 = 0x0002;
        const SYSTEM: u32 = 0x0004;
        const REPARSE_POINT: u32 = 0x0400;
        const OFFLINE: u32 = 0x1000;
        const RECALL_ON_OPEN: u32 = 0x0004_0000;
        const RECALL_ON_DATA_ACCESS: u32 = 0x0040_0000;
        let attributes = metadata.file_attributes();
        attributes
            & (HIDDEN | SYSTEM | REPARSE_POINT | OFFLINE | RECALL_ON_OPEN | RECALL_ON_DATA_ACCESS)
            != 0
    }
    #[cfg(not(windows))]
    {
        let _ = metadata;
        false
    }
}

fn validate_desktop_selection(
    desktop: &Path,
    selected_path: &str,
) -> Result<(PathBuf, u64), String> {
    let desktop = desktop
        .canonicalize()
        .map_err(|error| format!("无法解析桌面目录：{error}"))?;
    let path = PathBuf::from(selected_path)
        .canonicalize()
        .map_err(|error| format!("所选文件已不存在或不可访问：{error}"))?;
    if !is_inside_root(&path, &desktop) || path == desktop {
        return Err("所选路径不在当前用户桌面目录内".to_string());
    }
    let metadata =
        fs::symlink_metadata(&path).map_err(|error| format!("无法读取所选文件属性：{error}"))?;
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || unsafe_desktop_attributes(&metadata)
    {
        return Err("桌面归档只允许普通、本地、非隐藏且非重解析文件".to_string());
    }
    if metadata.permissions().readonly() || is_sensitive_account_data(&path) {
        return Err("只读、账户数据或敏感文件不能加入桌面操作计划".to_string());
    }
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if name.eq_ignore_ascii_case("desktop.ini") || name.eq_ignore_ascii_case("thumbs.db") {
        return Err("桌面系统文件不能加入操作计划".to_string());
    }
    if metadata.modified().ok().is_some_and(|modified| {
        SystemTime::now()
            .duration_since(modified)
            .unwrap_or_default()
            < RECENT_DESKTOP_FILE_AGE
    }) {
        return Err("最近 7 天内修改的桌面文件默认不处理".to_string());
    }
    Ok((path, metadata.len()))
}

fn archive_category(path: &Path) -> &'static str {
    match classify_file_type(path) {
        "安装包" => "Installers",
        "压缩包" => "Archives",
        "视频" => "Videos",
        "图片" => "Pictures",
        "文档" => "Documents",
        "ISO/磁盘镜像" => "Images",
        _ => "Other",
    }
}

fn build_desktop_items(
    desktop: &Path,
    target: &Path,
    selected_paths: Vec<String>,
) -> Result<Vec<MovePlanItem>, String> {
    if selected_paths.is_empty() {
        return Err("请先勾选至少一个可处理的桌面文件".to_string());
    }
    let mut sources = BTreeSet::new();
    let mut targets = BTreeSet::new();
    let mut items = Vec::new();
    for selected_path in selected_paths {
        let (source, size) = validate_desktop_selection(desktop, &selected_path)?;
        let source_key = source.to_string_lossy().to_ascii_lowercase();
        if !sources.insert(source_key) {
            continue;
        }
        let file_name = source
            .file_name()
            .ok_or_else(|| "所选文件没有有效文件名".to_string())?;
        let directory = target.join(archive_category(&source));
        let mut planned_target = directory.join(file_name);
        let stem = source
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("file");
        let extension = source.extension().and_then(|value| value.to_str());
        let mut index = 1_u32;
        while planned_target.exists()
            || !targets.insert(planned_target.to_string_lossy().to_ascii_lowercase())
        {
            let name = extension
                .map(|ext| format!("{stem}-{index}.{ext}"))
                .unwrap_or_else(|| format!("{stem}-{index}"));
            planned_target = directory.join(name);
            index += 1;
        }
        items.push(MovePlanItem {
            source: source.to_string_lossy().to_string(),
            target: planned_target.to_string_lossy().to_string(),
            size,
            sha256: sha256_file(&source)?,
        });
    }
    if items.is_empty() {
        return Err("所选桌面文件均不符合安全处理条件".to_string());
    }
    Ok(items)
}

fn plan_for_source(source: &Path, target: PathBuf, mode: &str) -> Result<MovePlan, String> {
    let mut warnings = ensure_movable_source(source, mode)?;
    let (bytes, items, truncated) = directory_size_filtered(source, |_| false);
    if truncated {
        warnings.push("目录较大，估算可能被截断；执行前会重新校验".to_string());
    }
    let risk = match mode {
        "junction_bridge" | "move_user_folder" => "high",
        "move_cache_folder" => "medium",
        _ => "low",
    };
    if mode == "junction_bridge" {
        warnings.push("Junction 会把原路径桥接到目标盘；执行前请关闭相关程序。".to_string());
    }
    Ok(MovePlan {
        plan_id: unique_id("move"),
        created_at: generated_at(),
        source: source.to_string_lossy().to_string(),
        target: target.to_string_lossy().to_string(),
        mode: mode.to_string(),
        estimated_bytes: bytes,
        item_count: items,
        risk: risk.to_string(),
        requires_admin: false,
        reversible: mode != "archive_only",
        selected_items: Vec::new(),
        warnings,
    })
}

pub fn create_move_plan(
    source: String,
    target_drive: String,
    mode: String,
) -> Result<MovePlan, String> {
    let source = PathBuf::from(source);
    let mode = match mode.as_str() {
        "archive_only" | "move_user_folder" | "move_cache_folder" | "junction_bridge" => mode,
        _ => return Err("不支持的空间搬家模式".to_string()),
    };
    let category = source
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Moved");
    let target = target_root_for_drive(&target_drive, category)?;
    plan_for_source(&source, target, &mode)
}

pub fn create_junction_bridge_plan(source: String, target: String) -> Result<MovePlan, String> {
    let source_path = PathBuf::from(source);
    let target_path = PathBuf::from(target);
    plan_for_source(&source_path, target_path, "junction_bridge")
}

pub fn create_desktop_archive_plan(
    target_drive: String,
    selected_paths: Vec<String>,
) -> Result<MovePlan, String> {
    let desktop = dirs::desktop_dir().ok_or_else(|| "无法识别桌面目录".to_string())?;
    let target = target_root_for_drive(&target_drive, "DesktopArchive")?;
    let selected_items = build_desktop_items(&desktop, &target, selected_paths)?;
    Ok(MovePlan {
        plan_id: unique_id("desktop-archive"),
        created_at: generated_at(),
        source: desktop.to_string_lossy().to_string(),
        target: target.to_string_lossy().to_string(),
        mode: "desktop_archive".to_string(),
        estimated_bytes: selected_items.iter().map(|item| item.size).sum(),
        item_count: selected_items.len(),
        risk: "high".to_string(),
        requires_admin: false,
        reversible: true,
        selected_items,
        warnings: vec![
            "执行时会再次校验桌面边界、文件大小和源文件 SHA-256".to_string(),
            "目标冲突使用计划中预览的唯一文件名，不覆盖现有文件".to_string(),
            "跨盘复制完成并验证目标 SHA-256 后才会删除源文件".to_string(),
        ],
    })
}

pub fn create_desktop_cleanup_plan(selected_paths: Vec<String>) -> Result<MovePlan, String> {
    let desktop = dirs::desktop_dir().ok_or_else(|| "无法识别桌面目录".to_string())?;
    let recycle_target = PathBuf::from("Recycle Bin");
    let mut selected_items = build_desktop_items(&desktop, &recycle_target, selected_paths)?;
    for item in &mut selected_items {
        let name = Path::new(&item.source)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("file");
        item.target = format!("Recycle Bin\\{name}");
    }
    Ok(MovePlan {
        plan_id: unique_id("desktop-recycle"),
        created_at: generated_at(),
        source: desktop.to_string_lossy().to_string(),
        target: "Recycle Bin".to_string(),
        mode: "desktop_recycle".to_string(),
        estimated_bytes: selected_items.iter().map(|item| item.size).sum(),
        item_count: selected_items.len(),
        risk: "medium".to_string(),
        requires_admin: false,
        reversible: true,
        selected_items,
        warnings: vec![
            "文件只会移动到 Windows 回收站，不会永久删除".to_string(),
            "执行时会再次校验桌面边界、文件大小和 SHA-256".to_string(),
            "恢复时请打开回收站并使用 Windows 的还原操作".to_string(),
        ],
    })
}

pub fn create_downloads_archive_plan(target_drive: String) -> Result<MovePlan, String> {
    let downloads = dirs::download_dir().ok_or_else(|| "无法识别下载目录".to_string())?;
    let target = target_root_for_drive(&target_drive, "DownloadsArchive")?;
    plan_for_source(&downloads, target, "archive_only")
}

pub fn execute_desktop_archive_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    execute_move_plan(managed_root, plan)
}

pub fn execute_desktop_cleanup_plan(plan: MovePlan) -> MoveResult {
    execute_desktop_recycle_plan(plan)
}

pub fn execute_downloads_archive_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    execute_move_plan(managed_root, plan)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn move_plan_uses_supported_modes_only() {
        let result = create_move_plan(
            "C:\\Users\\me\\Downloads".to_string(),
            "D:".to_string(),
            "bad".to_string(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn desktop_selection_rejects_recent_and_outside_files() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let desktop = root.path().join("desktop");
        fs::create_dir_all(&desktop).unwrap();
        let recent = desktop.join("recent.txt");
        fs::write(&recent, b"recent").unwrap();
        assert!(validate_desktop_selection(&desktop, &recent.to_string_lossy()).is_err());

        let outside = root.path().join("outside.txt");
        fs::write(&outside, b"outside").unwrap();
        assert!(validate_desktop_selection(&desktop, &outside.to_string_lossy()).is_err());
    }
}
