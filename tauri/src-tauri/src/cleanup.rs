use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const MAX_CANDIDATES: usize = 500;
const MAX_SCAN_ENTRIES: usize = 250_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupArchitecture {
    pub schema_version: u32,
    pub status: &'static str,
    pub categories: Vec<CleanupCategory>,
    pub safety_rules: Vec<&'static str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCategory {
    pub id: &'static str,
    pub name: &'static str,
    pub risk: &'static str,
    pub scan_only: bool,
    pub cleanup_enabled: bool,
    pub protected_patterns: Vec<&'static str>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCandidate {
    pub id: String,
    pub category_id: String,
    pub category_name: String,
    pub path: String,
    pub size: u64,
    pub modified_at: u64,
    pub risk: String,
    pub selected_by_default: bool,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupScanReport {
    pub generated_at: u64,
    pub total_size: u64,
    pub default_selected_size: u64,
    pub candidates: Vec<CleanupCandidate>,
    pub truncated: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupRunResult {
    pub cleaned_count: usize,
    pub reclaimed_bytes: u64,
    pub skipped: Vec<String>,
    pub history_file: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CleanupHistoryEntry {
    run_at: u64,
    cleaned_count: usize,
    reclaimed_bytes: u64,
    paths: Vec<String>,
    skipped: Vec<String>,
}

pub fn architecture() -> CleanupArchitecture {
    CleanupArchitecture {
        schema_version: 2,
        status: "preview-and-recycle-bin",
        categories: vec![
            CleanupCategory {
                id: "windows-temp",
                name: "Windows 与用户临时文件",
                risk: "medium",
                scan_only: false,
                cleanup_enabled: true,
                protected_patterns: vec!["24 小时内文件", "正在使用的文件", "系统更新目录"],
            },
            CleanupCategory {
                id: "developer-caches",
                name: "开发工具缓存",
                risk: "medium",
                scan_only: false,
                cleanup_enabled: true,
                protected_patterns: vec!["项目 node_modules", "受管运行时", "源码与配置"],
            },
            CleanupCategory {
                id: "browser-caches",
                name: "浏览器缓存",
                risk: "high",
                scan_only: false,
                cleanup_enabled: true,
                protected_patterns: vec!["Cookie", "登录状态", "密码数据库", "浏览器配置"],
            },
            CleanupCategory {
                id: "logs-and-dumps",
                name: "旧日志与崩溃转储",
                risk: "low",
                scan_only: false,
                cleanup_enabled: true,
                protected_patterns: vec!["最近 30 天诊断报告", "正在写入的日志"],
            },
            CleanupCategory {
                id: "recycle-bin",
                name: "Windows 回收站",
                risk: "high",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["本程序不清空回收站", "用户可从系统回收站恢复"],
            },
        ],
        safety_rules: vec![
            "先扫描预览，用户逐项选择后才执行",
            "前端只提交候选 ID，后端会重新扫描并校验真实路径",
            "清理使用 Windows 回收站，不执行永久删除",
            "系统目录、用户文档、项目目录和受管运行时永不作为候选",
            "浏览器缓存和开发工具缓存默认不选择",
            "正在使用或权限不足的文件会跳过，不强制解锁",
        ],
    }
}

pub fn scan(managed_root: &Path) -> Result<CleanupScanReport, String> {
    let mut candidates = Vec::new();
    let now = SystemTime::now();
    scan_old_children(
        &env::temp_dir(),
        "windows-temp",
        "用户临时文件",
        "medium",
        Duration::from_secs(24 * 60 * 60),
        true,
        "超过 24 小时的临时项目",
        now,
        &mut candidates,
    );
    if let Some(windows) = env::var_os("WINDIR") {
        scan_old_children(
            &PathBuf::from(windows).join("Temp"),
            "windows-temp",
            "Windows 临时文件",
            "medium",
            Duration::from_secs(7 * 24 * 60 * 60),
            true,
            "超过 7 天的 Windows 临时项目",
            now,
            &mut candidates,
        );
    }

    scan_old_children(
        &managed_root.join("downloads"),
        "developer-caches",
        "DevEnv 下载缓存",
        "low",
        Duration::from_secs(24 * 60 * 60),
        true,
        "已完成安装且超过 24 小时的下载缓存",
        now,
        &mut candidates,
    );
    scan_old_children(
        &managed_root.join("logs"),
        "logs-and-dumps",
        "DevEnv 旧报告",
        "low",
        Duration::from_secs(30 * 24 * 60 * 60),
        true,
        "超过 30 天的日志或诊断报告",
        now,
        &mut candidates,
    );

    for (path, name) in developer_cache_roots() {
        add_root_candidate(
            &path,
            "developer-caches",
            name,
            "medium",
            false,
            "工具会在下次使用时重新下载缓存",
            &mut candidates,
        );
    }
    for (path, name) in browser_cache_roots() {
        add_root_candidate(
            &path,
            "browser-caches",
            &name,
            "high",
            false,
            "仅浏览器 Cache/Code Cache/GPUCache，不包含 Cookie 和配置",
            &mut candidates,
        );
    }
    if let Some(local) = env::var_os("LOCALAPPDATA") {
        add_root_candidate(
            &PathBuf::from(local).join("CrashDumps"),
            "logs-and-dumps",
            "Windows 崩溃转储",
            "low",
            true,
            "应用崩溃生成的转储文件",
            &mut candidates,
        );
    }

    candidates.retain(|candidate| !path_is_protected(Path::new(&candidate.path), managed_root));
    candidates.sort_by_key(|item| std::cmp::Reverse(item.size));
    let truncated = candidates.len() > MAX_CANDIDATES;
    candidates.truncate(MAX_CANDIDATES);
    let total_size = candidates.iter().map(|item| item.size).sum();
    let default_selected_size = candidates
        .iter()
        .filter(|item| item.selected_by_default)
        .map(|item| item.size)
        .sum();
    Ok(CleanupScanReport {
        generated_at: unix_timestamp(now),
        total_size,
        default_selected_size,
        candidates,
        truncated,
        notes: vec![
            "关闭浏览器、安装器和包管理器后再清理，能够减少被占用项目".to_string(),
            "开发缓存清理后首次构建会重新下载依赖".to_string(),
            "回收站中的内容由 Windows 管理，可在系统回收站恢复".to_string(),
        ],
    })
}

pub fn clean(
    managed_root: &Path,
    config_dir: &Path,
    ids: &[String],
) -> Result<CleanupRunResult, String> {
    if ids.is_empty() {
        return Err("没有选择要清理的项目".to_string());
    }
    if ids.len() > 200 {
        return Err("单次最多清理 200 个项目".to_string());
    }
    let requested = ids.iter().cloned().collect::<HashSet<_>>();
    let fresh = scan(managed_root)?;
    let candidates = fresh
        .candidates
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect::<HashMap<_, _>>();
    let mut reclaimed_bytes = 0_u64;
    let mut cleaned_paths = Vec::new();
    let mut skipped = Vec::new();
    for id in requested {
        let Some(candidate) = candidates.get(&id) else {
            skipped.push(format!("候选项已变化或不再存在：{id}"));
            continue;
        };
        let path = PathBuf::from(&candidate.path);
        if path_is_protected(&path, managed_root) || !path.exists() {
            skipped.push(format!("已保护或不存在：{}", candidate.path));
            continue;
        }
        match trash::delete(&path) {
            Ok(()) => {
                reclaimed_bytes = reclaimed_bytes.saturating_add(candidate.size);
                cleaned_paths.push(candidate.path.clone());
            }
            Err(err) => skipped.push(format!("{}：{err}", candidate.path)),
        }
    }
    fs::create_dir_all(config_dir).map_err(|err| format!("创建清理记录目录失败：{err}"))?;
    let history_file = config_dir.join("cleanup-history.json");
    let mut history: Vec<CleanupHistoryEntry> = fs::read_to_string(&history_file)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default();
    history.push(CleanupHistoryEntry {
        run_at: unix_timestamp(SystemTime::now()),
        cleaned_count: cleaned_paths.len(),
        reclaimed_bytes,
        paths: cleaned_paths.clone(),
        skipped: skipped.clone(),
    });
    if history.len() > 100 {
        history.drain(0..history.len() - 100);
    }
    let data =
        serde_json::to_vec_pretty(&history).map_err(|err| format!("生成清理记录失败：{err}"))?;
    fs::write(&history_file, data).map_err(|err| format!("保存清理记录失败：{err}"))?;
    Ok(CleanupRunResult {
        cleaned_count: cleaned_paths.len(),
        reclaimed_bytes,
        skipped,
        history_file: history_file.to_string_lossy().to_string(),
    })
}

#[allow(clippy::too_many_arguments)]
fn scan_old_children(
    root: &Path,
    category_id: &str,
    category_name: &str,
    risk: &str,
    minimum_age: Duration,
    selected_by_default: bool,
    reason: &str,
    now: SystemTime,
    candidates: &mut Vec<CleanupCandidate>,
) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten().take(MAX_CANDIDATES) {
        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        let modified = metadata.modified().unwrap_or(UNIX_EPOCH);
        if now.duration_since(modified).unwrap_or_default() < minimum_age {
            continue;
        }
        let size = if metadata.is_dir() {
            directory_size(&path)
        } else {
            metadata.len()
        };
        if size == 0 {
            continue;
        }
        candidates.push(candidate(
            category_id,
            category_name,
            &path,
            size,
            modified,
            risk,
            selected_by_default,
            reason,
        ));
    }
}

fn add_root_candidate(
    path: &Path,
    category_id: &str,
    category_name: &str,
    risk: &str,
    selected_by_default: bool,
    reason: &str,
    candidates: &mut Vec<CleanupCandidate>,
) {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return;
    };
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return;
    }
    let size = directory_size(path);
    if size == 0 {
        return;
    }
    candidates.push(candidate(
        category_id,
        category_name,
        path,
        size,
        metadata.modified().unwrap_or(UNIX_EPOCH),
        risk,
        selected_by_default,
        reason,
    ));
}

#[allow(clippy::too_many_arguments)]
fn candidate(
    category_id: &str,
    category_name: &str,
    path: &Path,
    size: u64,
    modified: SystemTime,
    risk: &str,
    selected_by_default: bool,
    reason: &str,
) -> CleanupCandidate {
    let normalized = path.to_string_lossy().to_ascii_lowercase();
    let mut hasher = Sha256::new();
    hasher.update(category_id.as_bytes());
    hasher.update(b"\0");
    hasher.update(normalized.as_bytes());
    CleanupCandidate {
        id: format!("{:x}", hasher.finalize()),
        category_id: category_id.to_string(),
        category_name: category_name.to_string(),
        path: path.to_string_lossy().to_string(),
        size,
        modified_at: unix_timestamp(modified),
        risk: risk.to_string(),
        selected_by_default,
        reason: reason.to_string(),
    }
}

fn directory_size(root: &Path) -> u64 {
    let mut size = 0_u64;
    let mut visited = 0_usize;
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        if visited >= MAX_SCAN_ENTRIES {
            break;
        }
        visited += 1;
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_file() {
            size = size.saturating_add(metadata.len());
            continue;
        }
        if let Ok(entries) = fs::read_dir(path) {
            stack.extend(entries.flatten().map(|entry| entry.path()));
        }
    }
    size
}

fn developer_cache_roots() -> Vec<(PathBuf, &'static str)> {
    let mut roots = Vec::new();
    if let Some(local) = env::var_os("LOCALAPPDATA") {
        let local = PathBuf::from(local);
        roots.push((local.join("npm-cache"), "npm 缓存"));
        roots.push((local.join("pip").join("Cache"), "pip 缓存"));
        roots.push((local.join("uv").join("cache"), "uv 缓存"));
    }
    if let Some(home) = dirs::home_dir() {
        roots.push((home.join(".gradle").join("caches"), "Gradle 缓存"));
        roots.push((home.join(".m2").join("repository"), "Maven 本地仓库"));
        roots.push((
            home.join(".cargo").join("registry").join("cache"),
            "Cargo 包缓存",
        ));
    }
    roots
}

fn browser_cache_roots() -> Vec<(PathBuf, String)> {
    let Some(local) = env::var_os("LOCALAPPDATA") else {
        return Vec::new();
    };
    let mut roots = Vec::new();
    for (browser, user_data) in [
        (
            "Chrome",
            PathBuf::from(&local)
                .join("Google")
                .join("Chrome")
                .join("User Data"),
        ),
        (
            "Edge",
            PathBuf::from(&local)
                .join("Microsoft")
                .join("Edge")
                .join("User Data"),
        ),
    ] {
        let Ok(profiles) = fs::read_dir(user_data) else {
            continue;
        };
        for profile in profiles.flatten() {
            let profile_path = profile.path();
            let name = profile.file_name().to_string_lossy().to_string();
            if name != "Default" && !name.starts_with("Profile ") {
                continue;
            }
            for cache in ["Cache", "Code Cache", "GPUCache"] {
                roots.push((
                    profile_path.join(cache),
                    format!("{browser} {name} {cache}"),
                ));
            }
        }
    }
    roots
}

fn path_is_protected(path: &Path, managed_root: &Path) -> bool {
    let normalized = path
        .to_string_lossy()
        .trim_end_matches(['\\', '/'])
        .to_ascii_lowercase();
    if normalized.is_empty() || normalized.len() <= 3 {
        return true;
    }
    if let Some(home) = dirs::home_dir() {
        let home = home
            .to_string_lossy()
            .trim_end_matches(['\\', '/'])
            .to_ascii_lowercase();
        if normalized == home
            || [
                "desktop",
                "documents",
                "downloads",
                "pictures",
                "videos",
                "music",
            ]
            .iter()
            .any(|name| normalized == format!("{home}\\{name}"))
        {
            return true;
        }
    }
    let managed = managed_root
        .to_string_lossy()
        .trim_end_matches(['\\', '/'])
        .to_ascii_lowercase();
    normalized == managed
        || normalized.starts_with(&format!("{managed}\\current"))
        || normalized.starts_with(&format!("{managed}\\envs"))
}

fn unix_timestamp(value: SystemTime) -> u64 {
    value
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn managed_runtime_and_root_are_protected() {
        let root = PathBuf::from(r"D:\DevEnvManager");
        assert!(path_is_protected(&root, &root));
        assert!(path_is_protected(&root.join("current").join("jdk"), &root));
        assert!(!path_is_protected(
            &root.join("downloads").join("old.zip"),
            &root
        ));
    }

    #[test]
    fn cleanup_candidate_ids_are_stable() {
        let one = candidate(
            "test",
            "Test",
            Path::new(r"C:\Temp\one"),
            10,
            UNIX_EPOCH,
            "low",
            true,
            "test",
        );
        let two = candidate(
            "test",
            "Test",
            Path::new(r"c:\temp\ONE"),
            20,
            UNIX_EPOCH,
            "low",
            true,
            "test",
        );
        assert_eq!(one.id, two.id);
    }
}
