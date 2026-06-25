use super::downloads::classify_file_type;
use super::model::{MovePlan, MoveResult, RollbackRecord};
use super::protect::{is_inside_root, is_sensitive_account_data, should_skip_path};
use super::rollback::save_rollback_record;
use super::utils::{directory_size_filtered, generated_at, path_id};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime};

fn normalized(path: &Path) -> String {
    path.to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase()
}

pub(crate) fn target_root_for_drive(target_drive: &str, category: &str) -> Result<PathBuf, String> {
    let drive = target_drive
        .trim()
        .trim_end_matches('\\')
        .trim_end_matches('/');
    if drive.is_empty() {
        return Err("请选择目标盘或目标目录".to_string());
    }
    let root = if drive.ends_with(':') {
        PathBuf::from(format!(r"{drive}\DevEnvArchive\{category}"))
    } else {
        PathBuf::from(drive).join("DevEnvArchive").join(category)
    };
    if normalized(&root).starts_with("c:\\") {
        return Err("目标位置不能在 C 盘；空间搬家必须释放 C 盘空间".to_string());
    }
    Ok(root)
}

pub(crate) fn ensure_movable_source(source: &Path, mode: &str) -> Result<Vec<String>, String> {
    if !source.exists() {
        return Err("源路径不存在".to_string());
    }
    if fs::symlink_metadata(source)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(true)
    {
        return Err("源路径是符号链接或 Junction，已拒绝嵌套搬家".to_string());
    }
    if let Some(reason) = should_skip_path(source) {
        let lowered = normalized(source);
        let desktop_or_downloads =
            lowered.ends_with("\\desktop") || lowered.ends_with("\\downloads");
        if !(mode == "archive_only" && desktop_or_downloads) {
            return Err(reason);
        }
    }

    let Some(home) = dirs::home_dir() else {
        return Err("无法识别用户目录".to_string());
    };
    let allowed = [
        home.join("Downloads"),
        home.join("Documents"),
        home.join("Pictures"),
        home.join("Videos"),
        home.join("Music"),
        home.join(".npm"),
        home.join(".cache").join("pip"),
        home.join(".cache").join("uv"),
        home.join(".cache").join("pypoetry"),
        home.join(".m2").join("repository"),
        home.join(".gradle").join("caches"),
        home.join("go").join("pkg").join("mod"),
        home.join("AppData").join("Local").join("Temp"),
        home.join("AppData").join("Local").join("pip").join("Cache"),
        home.join("AppData")
            .join("Local")
            .join("pnpm")
            .join("store"),
        home.join("AppData")
            .join("Local")
            .join("Yarn")
            .join("Cache"),
        home.join("AppData")
            .join("Local")
            .join("NuGet")
            .join("Cache"),
    ];
    let mut warnings = Vec::new();
    if mode == "archive_only" && is_inside_root(source, &home.join("Desktop")) {
        warnings.push("桌面归档不会移动快捷方式、隐藏文件和系统文件".to_string());
        return Ok(warnings);
    }
    if allowed.iter().any(|root| is_inside_root(source, root)) {
        if ["Documents", "Pictures", "Videos", "Music"]
            .iter()
            .any(|name| is_inside_root(source, &home.join(name)))
        {
            warnings.push("用户资料目录需要二次确认；建议先备份重要文件".to_string());
        }
        return Ok(warnings);
    }
    Err("该路径不在空间搬家白名单内".to_string())
}

fn copy_dir_checked(source: &Path, target: &Path) -> Result<(u64, usize), String> {
    let mut bytes = 0_u64;
    let mut items = 0_usize;
    let mut stack = vec![source.to_path_buf()];
    while let Some(path) = stack.pop() {
        let rel = path.strip_prefix(source).unwrap_or(Path::new(""));
        let destination = target.join(rel);
        let metadata =
            fs::symlink_metadata(&path).map_err(|err| format!("读取源路径失败：{err}"))?;
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            fs::create_dir_all(&destination).map_err(|err| format!("创建目标目录失败：{err}"))?;
            for entry in fs::read_dir(&path).map_err(|err| format!("读取目录失败：{err}"))? {
                stack.push(
                    entry
                        .map_err(|err| format!("读取目录项失败：{err}"))?
                        .path(),
                );
            }
        } else if metadata.is_file() {
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent).map_err(|err| format!("创建目标目录失败：{err}"))?;
            }
            fs::copy(&path, &destination).map_err(|err| format!("复制文件失败：{err}"))?;
            bytes = bytes.saturating_add(metadata.len());
            items += 1;
        }
    }
    Ok((bytes, items))
}

#[cfg(windows)]
fn create_junction(source: &Path, target: &Path) -> Result<(), String> {
    let output = Command::new("cmd.exe")
        .args(["/C", "mklink", "/J"])
        .arg(source)
        .arg(target)
        .output()
        .map_err(|err| format!("创建 Junction 失败：{err}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(format!("创建 Junction 失败：{}{}", stdout, stderr))
    }
}

#[cfg(not(windows))]
fn create_junction(_source: &Path, _target: &Path) -> Result<(), String> {
    Err("Junction 仅支持 Windows".to_string())
}

fn archive_category(path: &Path, modified: Option<SystemTime>) -> Option<&'static str> {
    let name = path.file_name().and_then(OsStr::to_str).unwrap_or("");
    if path
        .extension()
        .and_then(OsStr::to_str)
        .is_some_and(|ext| matches!(ext.to_ascii_lowercase().as_str(), "lnk" | "url"))
    {
        return None;
    }
    if name.starts_with('.') {
        return None;
    }
    let kind = classify_file_type(path);
    match kind {
        "安装包" => Some("Installers"),
        "压缩包" => Some("Archives"),
        "视频" => Some("Videos"),
        "图片" => Some("Pictures"),
        "ISO/磁盘镜像" => Some("Images"),
        _ if modified.is_some_and(|time| {
            SystemTime::now()
                .duration_since(time)
                .unwrap_or(Duration::ZERO)
                >= Duration::from_secs(30 * 24 * 60 * 60)
        }) =>
        {
            Some("OldFiles")
        }
        _ => None,
    }
}

fn archive_files(source: &Path, target: &Path) -> Result<(u64, usize, Vec<String>), String> {
    let mut moved_bytes = 0_u64;
    let mut moved_items = 0_usize;
    let mut failures = Vec::new();
    for entry in fs::read_dir(source).map_err(|err| format!("读取归档源失败：{err}"))? {
        let Ok(entry) = entry else {
            continue;
        };
        let path = entry.path();
        if is_sensitive_account_data(&path) {
            continue;
        }
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink()
            || metadata.is_dir()
            || metadata.permissions().readonly()
        {
            continue;
        }
        let Some(category) = archive_category(&path, metadata.modified().ok()) else {
            continue;
        };
        let destination_dir = target.join(category);
        let destination =
            unique_destination(&destination_dir, path.file_name().unwrap_or_default());
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|err| format!("创建归档目录失败：{err}"))?;
        }
        match fs::rename(&path, &destination) {
            Ok(()) => {
                moved_bytes = moved_bytes.saturating_add(metadata.len());
                moved_items += 1;
            }
            Err(err) => failures.push(format!("{}：{err}", path.display())),
        }
    }
    Ok((moved_bytes, moved_items, failures))
}

fn unique_destination(directory: &Path, file_name: &OsStr) -> PathBuf {
    let candidate = directory.join(file_name);
    if !candidate.exists() {
        return candidate;
    }
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(OsStr::to_str)
        .unwrap_or("file");
    let extension = Path::new(file_name).extension().and_then(OsStr::to_str);
    for index in 1..1000 {
        let name = match extension {
            Some(ext) => format!("{stem}-{index}.{ext}"),
            None => format!("{stem}-{index}"),
        };
        let candidate = directory.join(name);
        if !candidate.exists() {
            return candidate;
        }
    }
    directory.join(format!(
        "{}-{}",
        generated_at(),
        file_name.to_string_lossy()
    ))
}

pub fn execute_move_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    let source = PathBuf::from(&plan.source);
    let target = PathBuf::from(&plan.target);
    let mut result = MoveResult {
        plan_id: plan.plan_id.clone(),
        target_path: plan.target.clone(),
        ..MoveResult::default()
    };
    if let Err(error) = ensure_movable_source(&source, &plan.mode) {
        result.failures.push(error);
        result.report_markdown = move_report(&plan, &result);
        return result;
    }
    if normalized(&target).starts_with("c:\\") {
        result.failures.push("目标位置不能在 C 盘".to_string());
        result.report_markdown = move_report(&plan, &result);
        return result;
    }

    let rollback_id = format!("rollback-{}", &path_id(&plan.mode, &source)[..16]);
    if plan.mode == "archive_only" {
        match archive_files(&source, &target) {
            Ok((bytes, items, failures)) => {
                result.success = failures.is_empty();
                result.moved_bytes = bytes;
                result.moved_items = items;
                result.failures = failures;
                result.rollback_id = Some(rollback_id.clone());
                let _ = save_rollback_record(
                    managed_root,
                    RollbackRecord {
                        rollback_id,
                        created_at: generated_at(),
                        operation_type: "archive_only".to_string(),
                        source: plan.source.clone(),
                        target: plan.target.clone(),
                        backup_path: None,
                        junction_path: None,
                        reversible: false,
                        notes: vec!["归档会移动多个文件到分类目录；如需恢复请根据报告手动移回。"
                            .to_string()],
                    },
                );
            }
            Err(error) => result.failures.push(error),
        }
        result.report_markdown = move_report(&plan, &result);
        return result;
    }

    let backup = source.with_file_name(format!(
        "{}.devenv-backup-{}",
        source
            .file_name()
            .and_then(OsStr::to_str)
            .unwrap_or("source"),
        generated_at()
    ));
    match copy_dir_checked(&source, &target) {
        Ok((bytes, items)) => {
            let (verify_bytes, verify_items, _) = directory_size_filtered(&target, |_| false);
            if verify_bytes != bytes || verify_items != items {
                result
                    .failures
                    .push("复制后校验文件数量或大小不一致，已停止创建 Junction".to_string());
            } else if let Err(err) = fs::rename(&source, &backup) {
                result
                    .failures
                    .push(format!("重命名源目录为备份失败：{err}"));
            } else if plan.mode == "junction_bridge"
                || plan.mode == "move_cache_folder"
                || plan.mode == "move_user_folder"
            {
                match create_junction(&source, &target) {
                    Ok(()) => {
                        result.success = true;
                        result.junction_created = true;
                        result.moved_bytes = bytes;
                        result.moved_items = items;
                        result.source_backup = Some(backup.to_string_lossy().to_string());
                        result.rollback_id = Some(rollback_id.clone());
                        let _ = save_rollback_record(
                            managed_root,
                            RollbackRecord {
                                rollback_id,
                                created_at: generated_at(),
                                operation_type: plan.mode.clone(),
                                source: plan.source.clone(),
                                target: plan.target.clone(),
                                backup_path: result.source_backup.clone(),
                                junction_path: Some(plan.source.clone()),
                                reversible: true,
                                notes: vec![
                                    "回滚会删除 Junction 并恢复 .devenv-backup 目录。".to_string()
                                ],
                            },
                        );
                    }
                    Err(err) => {
                        let _ = fs::rename(&backup, &source);
                        result.failures.push(err);
                    }
                }
            }
        }
        Err(error) => result.failures.push(error),
    }
    result.report_markdown = move_report(&plan, &result);
    result
}

pub(crate) fn move_report(plan: &MovePlan, result: &MoveResult) -> String {
    format!(
        "# 空间搬家报告\n\n- 计划：{}\n- 模式：{}\n- 源：{}\n- 目标：{}\n- 成功：{}\n- 移动文件：{}\n- 移动字节：{}\n- Junction：{}\n- 回滚 ID：{}\n\n{}",
        plan.plan_id,
        plan.mode,
        plan.source,
        plan.target,
        result.success,
        result.moved_items,
        result.moved_bytes,
        result.junction_created,
        result.rollback_id.clone().unwrap_or_else(|| "无".to_string()),
        if result.failures.is_empty() {
            "无失败项".to_string()
        } else {
            result.failures.iter().map(|item| format!("- {item}")).collect::<Vec<_>>().join("\n")
        }
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_drive_rejects_c_drive() {
        assert!(target_root_for_drive("C:", "Downloads").is_err());
        assert!(target_root_for_drive("D:", "Downloads").is_ok());
    }

    #[test]
    fn archive_category_skips_shortcuts() {
        assert!(archive_category(Path::new("x.lnk"), None).is_none());
        assert_eq!(
            archive_category(Path::new("setup.exe"), None),
            Some("Installers")
        );
    }
}
