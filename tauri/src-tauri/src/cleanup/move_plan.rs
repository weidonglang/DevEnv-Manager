use super::migration::{ensure_movable_source, execute_move_plan, target_root_for_drive};
use super::model::{MovePlan, MoveResult};
use super::utils::{directory_size_filtered, generated_at, path_id};
use std::path::{Path, PathBuf};

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
        plan_id: format!("move-{}-{}", generated_at(), &path_id(mode, source)[..12]),
        created_at: generated_at(),
        source: source.to_string_lossy().to_string(),
        target: target.to_string_lossy().to_string(),
        mode: mode.to_string(),
        estimated_bytes: bytes,
        item_count: items,
        risk: risk.to_string(),
        requires_admin: false,
        reversible: mode != "archive_only",
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

pub fn create_junction_bridge(
    managed_root: &Path,
    source: String,
    target: String,
) -> Result<MoveResult, String> {
    let source_path = PathBuf::from(source);
    let target_path = PathBuf::from(target);
    let plan = plan_for_source(&source_path, target_path, "junction_bridge")?;
    Ok(execute_move_plan(managed_root, plan))
}

pub fn create_desktop_archive_plan(target_drive: String) -> Result<MovePlan, String> {
    let desktop = dirs::desktop_dir().ok_or_else(|| "无法识别桌面目录".to_string())?;
    let target = target_root_for_drive(&target_drive, "DesktopArchive")?;
    plan_for_source(&desktop, target, "archive_only")
}

pub fn create_downloads_archive_plan(target_drive: String) -> Result<MovePlan, String> {
    let downloads = dirs::download_dir().ok_or_else(|| "无法识别下载目录".to_string())?;
    let target = target_root_for_drive(&target_drive, "DownloadsArchive")?;
    plan_for_source(&downloads, target, "archive_only")
}

pub fn execute_desktop_archive_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    execute_move_plan(managed_root, plan)
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
}
