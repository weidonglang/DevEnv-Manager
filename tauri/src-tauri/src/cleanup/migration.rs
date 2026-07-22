use super::downloads::classify_file_type;
use super::model::{MovePlan, MovePlanItem, MoveReceipt, MoveResult, RollbackRecord};
use super::protect::{is_inside_root, is_sensitive_account_data, should_skip_path};
use super::rollback::save_rollback_record;
use super::utils::{directory_size_filtered, generated_at, path_id};
use sha2::{Digest, Sha256};
use std::ffi::OsStr;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime};

fn normalized(path: &Path) -> String {
    path.to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase()
}

fn is_expected_archive_root_with(
    source: &Path,
    mode: &str,
    desktop: Option<&Path>,
    downloads: Option<&Path>,
) -> bool {
    let source = normalized(source);
    match mode {
        "desktop_archive" | "desktop_recycle" => {
            desktop.map(normalized).is_some_and(|root| source == root)
        }
        "archive_only" => [desktop, downloads]
            .into_iter()
            .flatten()
            .map(normalized)
            .any(|root| source == root),
        _ => false,
    }
}

fn is_expected_archive_root(source: &Path, mode: &str) -> bool {
    let desktop = dirs::desktop_dir();
    let downloads = dirs::download_dir();
    is_expected_archive_root_with(source, mode, desktop.as_deref(), downloads.as_deref())
}

fn path_is_reparse_point(path: &Path) -> bool {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return false;
    };
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    false
}

fn validate_new_move_target(target: &Path) -> Result<(), String> {
    if target.exists() {
        return Err("目标路径已经存在；空间搬家不会合并或覆盖现有目录".to_string());
    }
    let mut cursor = target.parent();
    while let Some(path) = cursor {
        if path.exists() && path_is_reparse_point(path) {
            return Err(format!(
                "目标路径包含符号链接、Junction 或 reparse point：{}",
                path.display()
            ));
        }
        cursor = path.parent();
    }
    let existing_parent = target
        .ancestors()
        .find(|path| path.exists())
        .ok_or_else(|| "无法解析目标路径所在卷".to_string())?;
    let resolved_parent = existing_parent
        .canonicalize()
        .map_err(|error| format!("解析目标路径失败：{error}"))?;
    if normalized(&resolved_parent).starts_with("c:\\") {
        return Err("目标位置解析后位于 C 盘".to_string());
    }
    Ok(())
}

pub(crate) fn validate_archive_target_boundary(target: &Path) -> Result<(), String> {
    let target_text = normalized(target);
    let bytes = target_text.as_bytes();
    let drive_absolute =
        bytes.len() >= 3 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && bytes[2] == b'\\';
    let unc = target_text.starts_with("\\\\")
        && !target_text.starts_with("\\\\?\\")
        && !target_text.starts_with("\\\\.\\");
    if !drive_absolute && !unc {
        return Err("归档目标必须是绝对 Windows 路径".to_string());
    }
    if target_text.starts_with("c:\\") {
        return Err("归档目标不能位于系统 C 盘".to_string());
    }
    if target
        .ancestors()
        .any(|path| path.exists() && path_is_reparse_point(path))
    {
        return Err("归档目标路径包含符号链接、Junction 或重解析点".to_string());
    }
    let existing_target_ancestor = target
        .ancestors()
        .find(|path| path.exists())
        .ok_or_else(|| "无法解析归档目标所在卷".to_string())?;
    let resolved_target_ancestor = existing_target_ancestor
        .canonicalize()
        .map_err(|error| format!("无法解析归档目标边界：{error}"))?;
    if normalized(&resolved_target_ancestor).starts_with("c:\\") {
        return Err("归档目标解析后位于系统 C 盘".to_string());
    }
    Ok(())
}

pub(crate) fn target_root_for_drive(target_drive: &str, category: &str) -> Result<PathBuf, String> {
    let selection = target_drive
        .trim()
        .trim_end_matches('\\')
        .trim_end_matches('/');
    if selection.is_empty() || selection.contains('\0') || selection.chars().any(char::is_control) {
        return Err("请选择目标盘或目标目录".to_string());
    }
    let bytes = selection.as_bytes();
    let drive_only = bytes.len() == 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':';
    let drive_absolute = bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && matches!(bytes[2], b'\\' | b'/');
    let unc = selection.starts_with("\\\\")
        && !selection.starts_with("\\\\?\\")
        && !selection.starts_with("\\\\.\\");
    let root = if drive_only {
        PathBuf::from(format!(
            r"{}:\DevEnvArchive\{category}",
            (bytes[0] as char).to_ascii_uppercase()
        ))
    } else if drive_absolute || unc {
        PathBuf::from(selection)
            .join("DevEnvArchive")
            .join(category)
    } else {
        return Err("目标目录必须是绝对 Windows 路径".to_string());
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
        if !is_expected_archive_root(source, mode) {
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
    if is_expected_archive_root(source, mode) {
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

pub(crate) fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path)
        .map_err(|error| format!("无法读取文件 {}：{error}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("读取文件失败 {}：{error}", path.display()))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn validate_planned_archive_item(
    source_root: &Path,
    target_root: &Path,
    item: &MovePlanItem,
) -> Result<(PathBuf, PathBuf), String> {
    let canonical_source_root = source_root
        .canonicalize()
        .map_err(|error| format!("无法解析归档源目录：{error}"))?;
    let source = PathBuf::from(&item.source)
        .canonicalize()
        .map_err(|error| format!("归档源文件已不存在：{error}"))?;
    if !is_inside_root(&source, &canonical_source_root) || source == canonical_source_root {
        return Err("计划中的文件已越过归档源目录边界".to_string());
    }
    let metadata =
        fs::symlink_metadata(&source).map_err(|error| format!("无法读取归档源文件：{error}"))?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || path_is_reparse_point(&source) {
        return Err("计划中的归档源已不再是普通文件".to_string());
    }
    if is_sensitive_account_data(&source) || metadata.len() != item.size {
        return Err("计划中的归档源大小或安全属性已变化".to_string());
    }
    if !sha256_file(&source)?.eq_ignore_ascii_case(&item.sha256) {
        return Err("计划中的归档源 SHA-256 已变化，请重新创建计划".to_string());
    }
    let target = PathBuf::from(&item.target);
    if !target.starts_with(target_root) || target.exists() {
        return Err("归档目标越界或已发生冲突，请重新创建计划".to_string());
    }
    Ok((source, target))
}

fn restore_archive_receipts(receipts: &[MoveReceipt]) -> Vec<String> {
    let mut failures = Vec::new();
    for receipt in receipts.iter().rev() {
        let source = PathBuf::from(&receipt.source);
        let target = PathBuf::from(&receipt.target);
        if source.exists() {
            failures.push(format!("自动恢复跳过，原位置已存在：{}", source.display()));
            continue;
        }
        let target_hash_matches = sha256_file(&target)
            .is_ok_and(|hash| hash.eq_ignore_ascii_case(&receipt.target_sha256));
        if !target.exists() || !target_hash_matches {
            failures.push(format!(
                "自动恢复跳过，目标文件缺失或哈希变化：{}",
                target.display()
            ));
            continue;
        }
        if let Some(parent) = source.parent() {
            if let Err(error) = fs::create_dir_all(parent) {
                failures.push(format!(
                    "自动恢复无法创建原目录 {}：{error}",
                    parent.display()
                ));
                continue;
            }
        }
        match fs::copy(&target, &source) {
            Ok(copied)
                if copied == receipt.size
                    && sha256_file(&source)
                        .is_ok_and(|hash| hash.eq_ignore_ascii_case(&receipt.source_sha256)) =>
            {
                if let Err(error) = fs::remove_file(&target) {
                    failures.push(format!(
                        "自动恢复后无法移除归档副本 {}：{error}",
                        target.display()
                    ));
                }
            }
            Ok(_) => {
                let _ = fs::remove_file(&source);
                failures.push(format!("自动恢复校验失败：{}", source.display()));
            }
            Err(error) => failures.push(format!("自动恢复复制失败 {}：{error}", source.display())),
        }
    }
    failures
}

fn archive_selected_files(
    source: &Path,
    target: &Path,
    selected_items: &[MovePlanItem],
) -> Result<(u64, usize, Vec<String>, Vec<MoveReceipt>), String> {
    validate_archive_target_boundary(target)?;
    let mut moved_bytes = 0_u64;
    let mut receipts = Vec::new();
    let mut failures = Vec::new();
    for item in selected_items {
        let (source_path, target_path) = match validate_planned_archive_item(source, target, item) {
            Ok(paths) => paths,
            Err(error) => {
                failures.push(format!("{}：{error}", item.source));
                break;
            }
        };
        if let Some(parent) = target_path.parent() {
            if path_is_reparse_point(parent) {
                failures.push(format!("归档目标父目录是重解析点：{}", parent.display()));
                break;
            }
            if let Err(error) = fs::create_dir_all(parent) {
                failures.push(format!("创建归档目录失败：{error}"));
                break;
            }
        }
        let copied = match fs::copy(&source_path, &target_path) {
            Ok(value) => value,
            Err(error) => {
                failures.push(format!(
                    "复制归档文件失败 {}：{error}",
                    source_path.display()
                ));
                break;
            }
        };
        let target_hash = sha256_file(&target_path).unwrap_or_default();
        if copied != item.size || !target_hash.eq_ignore_ascii_case(&item.sha256) {
            let _ = fs::remove_file(&target_path);
            failures.push(format!(
                "归档目标 SHA-256 校验失败：{}",
                target_path.display()
            ));
            break;
        }
        if let Err(error) = fs::remove_file(&source_path) {
            let _ = fs::remove_file(&target_path);
            failures.push(format!(
                "目标验证成功但无法移除源文件 {}：{error}",
                source_path.display()
            ));
            break;
        }
        receipts.push(MoveReceipt {
            source: source_path.to_string_lossy().to_string(),
            target: target_path.to_string_lossy().to_string(),
            size: item.size,
            source_sha256: item.sha256.clone(),
            target_sha256: target_hash,
        });
        moved_bytes = moved_bytes.saturating_add(item.size);
    }
    if !failures.is_empty() && !receipts.is_empty() {
        let recovery_failures = restore_archive_receipts(&receipts);
        if recovery_failures.is_empty() {
            failures.push("执行未全部完成，已自动恢复本次已移动的文件".to_string());
            receipts.clear();
            moved_bytes = 0;
        } else {
            failures.push("执行未全部完成，自动恢复也存在失败，请使用回执人工核对".to_string());
            failures.extend(recovery_failures);
        }
    }
    let moved_items = receipts.len();
    Ok((moved_bytes, moved_items, failures, receipts))
}

fn archive_files(
    source: &Path,
    target: &Path,
    selected_items: &[MovePlanItem],
) -> Result<(u64, usize, Vec<String>, Vec<MoveReceipt>), String> {
    if !selected_items.is_empty() {
        return archive_selected_files(source, target, selected_items);
    }
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
    Ok((moved_bytes, moved_items, failures, Vec::new()))
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

fn execute_move_plan_with<F>(managed_root: &Path, plan: MovePlan, validate_source: F) -> MoveResult
where
    F: Fn(&Path, &str) -> Result<Vec<String>, String>,
{
    let source = PathBuf::from(&plan.source);
    let target = PathBuf::from(&plan.target);
    let mut result = MoveResult {
        plan_id: plan.plan_id.clone(),
        target_path: plan.target.clone(),
        ..MoveResult::default()
    };
    if let Err(error) = validate_source(&source, &plan.mode) {
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
    if matches!(plan.mode.as_str(), "archive_only" | "desktop_archive") {
        if let Err(error) = validate_archive_target_boundary(&target) {
            result.failures.push(error);
            result.report_markdown = move_report(&plan, &result);
            return result;
        }
        match archive_files(&source, &target, &plan.selected_items) {
            Ok((bytes, items, failures, receipts)) => {
                result.success = failures.is_empty();
                result.moved_bytes = bytes;
                result.moved_items = items;
                result.failures = failures;
                result.receipts = receipts.clone();
                if !receipts.is_empty() {
                    result.rollback_id = Some(rollback_id.clone());
                    let selected_archive = !plan.selected_items.is_empty();
                    let record_result = save_rollback_record(
                        managed_root,
                        RollbackRecord {
                            rollback_id: rollback_id.clone(),
                            created_at: generated_at(),
                            operation_type: plan.mode.clone(),
                            source: plan.source.clone(),
                            target: plan.target.clone(),
                            backup_path: None,
                            junction_path: None,
                            reversible: selected_archive,
                            moved_files: receipts.clone(),
                            notes: if selected_archive {
                                vec!["回滚会逐项校验归档目标 SHA-256，再复制回原位置。".to_string()]
                            } else {
                                vec!["旧版批量归档没有逐文件哈希回执，需要根据报告手动移回。"
                                    .to_string()]
                            },
                        },
                    );
                    if let Err(error) = record_result {
                        result.success = false;
                        result.rollback_id = None;
                        result.failures.push(format!(
                            "无法持久保存归档回滚记录，已停止完成本次操作：{error}"
                        ));
                        if selected_archive {
                            let recovery_failures = restore_archive_receipts(&receipts);
                            if recovery_failures.is_empty() {
                                result.failures.push(
                                    "已自动恢复本次已移动的桌面文件，源文件保持不变".to_string(),
                                );
                                result.moved_bytes = 0;
                                result.moved_items = 0;
                                result.receipts.clear();
                            } else {
                                result
                                    .failures
                                    .push("自动恢复未完全成功，请按页面回执人工核对".to_string());
                                result.failures.extend(recovery_failures);
                            }
                        }
                    }
                }
            }
            Err(error) => result.failures.push(error),
        }
        result.report_markdown = move_report(&plan, &result);
        return result;
    }

    if let Err(error) = validate_new_move_target(&target) {
        result.failures.push(error);
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
                                moved_files: Vec::new(),
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

pub fn execute_move_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    execute_move_plan_with(managed_root, plan, ensure_movable_source)
}

fn execute_desktop_recycle_plan_with<F>(plan: MovePlan, recycle: F) -> MoveResult
where
    F: Fn(&Path) -> Result<(), String>,
{
    let mut result = MoveResult {
        plan_id: plan.plan_id.clone(),
        target_path: "Recycle Bin".to_string(),
        ..MoveResult::default()
    };
    if plan.mode != "desktop_recycle" || plan.selected_items.is_empty() {
        result
            .failures
            .push("桌面回收站计划无效或没有所选文件".to_string());
        result.report_markdown = move_report(&plan, &result);
        return result;
    }
    let source_root = PathBuf::from(&plan.source);
    let recycle_root = Path::new("Recycle Bin");
    let mut validated = Vec::new();
    for item in &plan.selected_items {
        match validate_planned_archive_item(&source_root, recycle_root, item) {
            Ok((source, _)) => validated.push((item, source)),
            Err(error) => {
                result.failures.push(format!("{}：{error}", item.source));
            }
        }
    }
    if !result.failures.is_empty() {
        result.report_markdown = move_report(&plan, &result);
        return result;
    }
    for (item, source) in validated {
        match recycle(&source) {
            Ok(()) => {
                result.moved_items += 1;
                result.moved_bytes = result.moved_bytes.saturating_add(item.size);
                result.receipts.push(MoveReceipt {
                    source: item.source.clone(),
                    target: "Recycle Bin".to_string(),
                    size: item.size,
                    source_sha256: item.sha256.clone(),
                    target_sha256: item.sha256.clone(),
                });
            }
            Err(error) => result
                .failures
                .push(format!("移入回收站失败 {}：{error}", source.display())),
        }
    }
    result.success = result.failures.is_empty() && result.moved_items == plan.selected_items.len();
    result.report_markdown = move_report(&plan, &result);
    result
}

pub fn execute_desktop_recycle_plan(plan: MovePlan) -> MoveResult {
    execute_desktop_recycle_plan_with(plan, |source| {
        trash::delete(source).map_err(|error| error.to_string())
    })
}

#[cfg(feature = "acceptance-fixtures")]
pub(crate) fn execute_isolated_move_plan(managed_root: &Path, plan: MovePlan) -> MoveResult {
    execute_move_plan_with(managed_root, plan, |source, _| {
        if !source.is_dir() || path_is_reparse_point(source) {
            return Err("Fixture source is missing or redirected".to_string());
        }
        Ok(Vec::new())
    })
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
    use std::io::Write;

    #[test]
    fn target_drive_rejects_c_drive() {
        assert!(target_root_for_drive("C:", "Downloads").is_err());
        assert!(target_root_for_drive("D:", "Downloads").is_ok());
        assert!(target_root_for_drive(r"D:\ReleaseLab\Archive", "Downloads").is_ok());
        assert!(target_root_for_drive("relative-folder", "Downloads").is_err());
        assert!(target_root_for_drive(r"D:relative-folder", "Downloads").is_err());
        assert!(target_root_for_drive(r"\\?\D:\Archive", "Downloads").is_err());
    }

    #[test]
    fn archive_root_exception_is_exact_and_mode_bound() {
        let desktop = Path::new(r"C:\Users\ReleaseLabAdmin\Desktop");
        let downloads = Path::new(r"C:\Users\ReleaseLabAdmin\Downloads");

        assert!(is_expected_archive_root_with(
            desktop,
            "desktop_archive",
            Some(desktop),
            Some(downloads)
        ));
        assert!(is_expected_archive_root_with(
            downloads,
            "archive_only",
            Some(desktop),
            Some(downloads)
        ));
        assert!(!is_expected_archive_root_with(
            &desktop.join("nested"),
            "desktop_archive",
            Some(desktop),
            Some(downloads)
        ));
        assert!(!is_expected_archive_root_with(
            desktop,
            "move_user_folder",
            Some(desktop),
            Some(downloads)
        ));
        assert!(!is_expected_archive_root_with(
            downloads,
            "desktop_archive",
            Some(desktop),
            Some(downloads)
        ));
    }

    #[test]
    fn archive_category_skips_shortcuts() {
        assert!(archive_category(Path::new("x.lnk"), None).is_none());
        assert_eq!(
            archive_category(Path::new("setup.exe"), None),
            Some("Installers")
        );
    }

    #[test]
    fn move_target_must_not_merge_with_existing_directory() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let target = root.path().join("existing");
        fs::create_dir_all(&target).unwrap();
        assert!(validate_new_move_target(&target).is_err());
    }

    #[test]
    fn selected_archive_verifies_receipt_and_rolls_back() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let managed = root.path().join("managed");
        let source_root = root.path().join("desktop");
        let target_root = root.path().join("archive");
        fs::create_dir_all(&source_root).unwrap();
        fs::create_dir_all(&managed).unwrap();
        let source = source_root.join("old.txt");
        let mut file = fs::File::create(&source).unwrap();
        file.write_all(b"verified desktop archive").unwrap();
        drop(file);
        let hash = sha256_file(&source).unwrap();
        let target = target_root.join("Documents").join("old.txt");
        let plan = MovePlan {
            plan_id: "desktop-plan-1".to_string(),
            created_at: generated_at(),
            source: source_root.to_string_lossy().to_string(),
            target: target_root.to_string_lossy().to_string(),
            mode: "desktop_archive".to_string(),
            estimated_bytes: 24,
            item_count: 1,
            risk: "high".to_string(),
            requires_admin: false,
            reversible: true,
            selected_items: vec![MovePlanItem {
                source: source.to_string_lossy().to_string(),
                target: target.to_string_lossy().to_string(),
                size: 24,
                sha256: hash,
            }],
            warnings: Vec::new(),
        };
        let result = execute_move_plan_with(&managed, plan, |_, _| Ok(Vec::new()));
        assert!(result.success, "{:?}", result.failures);
        assert_eq!(result.receipts.len(), 1);
        assert!(!source.exists());
        assert!(target.exists());
        let rollback_id = result.rollback_id.unwrap();
        super::super::rollback::rollback_move(&managed, rollback_id).unwrap();
        assert!(source.exists());
        assert!(!target.exists());
    }

    #[test]
    fn selected_archive_restores_source_when_rollback_record_cannot_be_saved() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let managed = root.path().join("managed-file");
        fs::write(&managed, b"not a directory").unwrap();
        let source_root = root.path().join("desktop");
        let target_root = root.path().join("archive");
        fs::create_dir_all(&source_root).unwrap();
        let source = source_root.join("old.txt");
        fs::write(&source, b"rollback receipt required").unwrap();
        let size = fs::metadata(&source).unwrap().len();
        let target = target_root.join("Documents").join("old.txt");
        let plan = MovePlan {
            plan_id: "desktop-plan-receipt-failure".to_string(),
            source: source_root.to_string_lossy().to_string(),
            target: target_root.to_string_lossy().to_string(),
            mode: "desktop_archive".to_string(),
            estimated_bytes: size,
            item_count: 1,
            risk: "high".to_string(),
            reversible: true,
            selected_items: vec![MovePlanItem {
                source: source.to_string_lossy().to_string(),
                target: target.to_string_lossy().to_string(),
                size,
                sha256: sha256_file(&source).unwrap(),
            }],
            ..MovePlan::default()
        };
        let result = execute_move_plan_with(&managed, plan, |_, _| Ok(Vec::new()));
        assert!(!result.success);
        assert_eq!(result.moved_items, 0);
        assert!(result.rollback_id.is_none());
        assert!(result.receipts.is_empty());
        assert!(source.exists());
        assert!(!target.exists());
    }

    #[test]
    fn selected_archive_rejects_source_changed_after_preview() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let source_root = root.path().join("desktop");
        let target_root = root.path().join("archive");
        fs::create_dir_all(&source_root).unwrap();
        let source = source_root.join("old.txt");
        fs::write(&source, b"changed").unwrap();
        let plan = MovePlan {
            plan_id: "desktop-plan-2".to_string(),
            source: source_root.to_string_lossy().to_string(),
            target: target_root.to_string_lossy().to_string(),
            mode: "desktop_archive".to_string(),
            selected_items: vec![MovePlanItem {
                source: source.to_string_lossy().to_string(),
                target: target_root.join("old.txt").to_string_lossy().to_string(),
                size: 7,
                sha256: "0".repeat(64),
            }],
            ..MovePlan::default()
        };
        let result = execute_move_plan_with(root.path(), plan, |_, _| Ok(Vec::new()));
        assert!(!result.success);
        assert!(result
            .failures
            .iter()
            .any(|failure| failure.contains("SHA-256")));
        assert!(source.exists());
    }

    #[test]
    fn desktop_recycle_uses_injected_recycle_boundary_and_returns_receipt() {
        let root = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
        let source_root = root.path().join("desktop");
        let recycle_root = root.path().join("recycle-fixture");
        fs::create_dir_all(&source_root).unwrap();
        fs::create_dir_all(&recycle_root).unwrap();
        let source = source_root.join("old.log");
        fs::write(&source, b"recycle fixture").unwrap();
        let hash = sha256_file(&source).unwrap();
        let plan = MovePlan {
            plan_id: "desktop-recycle-1".to_string(),
            source: source_root.to_string_lossy().to_string(),
            target: "Recycle Bin".to_string(),
            mode: "desktop_recycle".to_string(),
            selected_items: vec![MovePlanItem {
                source: source.to_string_lossy().to_string(),
                target: "Recycle Bin\\old.log".to_string(),
                size: 15,
                sha256: hash,
            }],
            ..MovePlan::default()
        };
        let result = execute_desktop_recycle_plan_with(plan, |path| {
            fs::rename(path, recycle_root.join("old.log")).map_err(|error| error.to_string())
        });
        assert!(result.success, "{:?}", result.failures);
        assert_eq!(result.receipts.len(), 1);
        assert!(!source.exists());
        assert!(recycle_root.join("old.log").exists());
    }
}
