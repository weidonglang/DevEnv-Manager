pub mod apply;
pub mod diff;
pub mod java;
pub mod maven_gradle;
pub mod node;
pub mod path_rules;
pub mod plan;
pub mod python;
pub mod report;
pub mod resolver;
pub mod rollback;
pub mod snapshot;
pub mod verify;

pub use apply::{apply_env_repair_plan, EnvRepairResult};
pub use java::{create_java_stabilize_plan, verify_java_toolchain, JavaVerificationReport};
pub use maven_gradle::{repair_maven_gradle_registration, MavenGradleReliability};
pub use plan::{create_env_repair_plan, EnvRepairOptions, EnvRepairPlan};
pub use report::export_env_reliability_report;
pub use rollback::{
    inspect_env_backup, list_env_backups, restore_env_backup, EnvBackupDiff, EnvBackupRecord,
};
#[allow(unused_imports)]
pub use snapshot::{
    inspect_env_reliability, EffectiveToolSnapshot, EnvIssue, EnvLayerSnapshot,
    EnvReliabilitySnapshot, EnvSuggestion, ExpectedEnvState, NodeEnvReliability, PathAnalysis,
    PathEntryInfo, PythonEnvReliability, RuntimeCandidate, ToolProbe,
};
pub use verify::{
    verify_env_after_apply, verify_nacos_java_environment, EnvVerificationReport, NacosEnvReport,
};

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use winreg::{enums::*, RegKey};

pub const MANAGED_PATHS: [&str; 8] = [
    r"%DEVENV_HOME%\current\jdk\bin",
    r"%DEVENV_HOME%\current\python",
    r"%DEVENV_HOME%\current\python\Scripts",
    r"%DEVENV_HOME%\current\node",
    r"%DEVENV_HOME%\current\maven\bin",
    r"%DEVENV_HOME%\current\gradle\bin",
    r"%DEVENV_HOME%\current\go\bin",
    r"%DEVENV_HOME%\tools\npm-global",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EnvRepairAction {
    pub id: String,
    pub title: String,
    pub description: String,
    pub variable: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub risk: String,
    pub reversible: bool,
}

pub(crate) fn now_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

pub(crate) fn app_config_dir() -> PathBuf {
    dirs::data_local_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("DevEnvManager")
}

pub(crate) fn display_path(path: impl AsRef<Path>) -> String {
    path.as_ref().to_string_lossy().to_string()
}

pub(crate) fn path_key(value: &str) -> String {
    value
        .trim()
        .trim_matches('"')
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase()
}

pub(crate) fn split_path(value: &str) -> Vec<String> {
    value
        .split(';')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(str::to_string)
        .collect()
}

pub(crate) fn user_environment() -> Result<HashMap<String, String>, String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let env_key = hkcu
            .create_subkey("Environment")
            .map_err(|err| format!("打开用户环境变量失败：{err}"))?
            .0;
        let mut result = HashMap::new();
        for item in env_key.enum_values() {
            let (name, value) = item.map_err(|err| format!("读取用户环境变量失败：{err}"))?;
            result.insert(name, value.to_string());
        }
        Ok(result)
    }
    #[cfg(not(windows))]
    {
        Ok(env::vars().collect())
    }
}

pub(crate) fn process_environment() -> HashMap<String, String> {
    env::vars().collect()
}

pub(crate) fn set_user_environment(values: &HashMap<String, Option<String>>) -> Result<(), String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (env_key, _) = hkcu
            .create_subkey("Environment")
            .map_err(|err| format!("打开用户环境变量失败：{err}"))?;
        for (name, value) in values {
            match value {
                Some(value) => env_key
                    .set_value(name, value)
                    .map_err(|err| format!("写入 {name} 失败：{err}"))?,
                None => {
                    let _ = env_key.delete_value(name);
                }
            }
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = values;
        Err("环境变量写入仅支持 Windows".to_string())
    }
}

pub(crate) fn broadcast_environment_change() {
    #[cfg(windows)]
    {
        let script = r#"
Add-Type -Namespace Win32 -Name Native -MemberDefinition '[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);' | Out-Null
$result = [UIntPtr]::Zero
[Win32.Native]::SendMessageTimeout([IntPtr]0xffff, 0x1a, [UIntPtr]::Zero, 'Environment', 0x2, 5000, [ref]$result) | Out-Null
"#;
        let _ = hidden_command("powershell.exe")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .output();
    }
}

pub(crate) fn expand_env_value(
    value: &str,
    envs: &HashMap<String, String>,
    managed_root: &Path,
) -> String {
    let mut result = value.to_string();
    let mut replacements = BTreeMap::new();
    replacements.insert("DEVENV_HOME".to_string(), display_path(managed_root));
    for (key, value) in envs {
        replacements.insert(key.to_ascii_uppercase(), value.clone());
    }
    for _ in 0..4 {
        let before = result.clone();
        for (key, replacement) in &replacements {
            result = result.replace(&format!("%{key}%"), replacement);
            result = result.replace(&format!("%{}%", key.to_ascii_lowercase()), replacement);
        }
        if before == result {
            break;
        }
    }
    result
}

pub(crate) fn hidden_command(path: impl AsRef<Path>) -> Command {
    let mut command = Command::new(path.as_ref());
    #[cfg(windows)]
    {
        command.creation_flags(0x08000000);
    }
    command
}

pub(crate) fn command_text(stdout: &[u8], stderr: &[u8]) -> String {
    let mut text = String::new();
    text.push_str(&String::from_utf8_lossy(stdout));
    text.push_str(&String::from_utf8_lossy(stderr));
    text.trim().to_string()
}

pub(crate) fn run_command(path: &Path, args: &[&str]) -> String {
    hidden_command(path)
        .args(args)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| command_text(&output.stdout, &output.stderr))
        .unwrap_or_default()
}

pub(crate) fn find_in_path(
    executable: &str,
    path_value: &str,
    envs: &HashMap<String, String>,
    managed_root: &Path,
) -> Option<PathBuf> {
    for entry in split_path(path_value) {
        let dir = PathBuf::from(expand_env_value(&entry, envs, managed_root));
        for suffix in [".exe", ".cmd", ".bat", ""] {
            let candidate = dir.join(format!("{executable}{suffix}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

pub(crate) fn all_in_path(
    executable: &str,
    path_value: &str,
    envs: &HashMap<String, String>,
    managed_root: &Path,
) -> Vec<PathBuf> {
    let mut seen = BTreeSet::new();
    let mut result = Vec::new();
    for entry in split_path(path_value) {
        let dir = PathBuf::from(expand_env_value(&entry, envs, managed_root));
        for suffix in [".exe", ".cmd", ".bat", ""] {
            let candidate = dir.join(format!("{executable}{suffix}"));
            if candidate.is_file() && seen.insert(path_key(&display_path(&candidate))) {
                result.push(candidate);
            }
        }
    }
    result
}

pub(crate) fn is_java_home_root(path: &Path) -> bool {
    path.is_dir()
        && path.file_name().and_then(|value| value.to_str()) != Some("bin")
        && path.join("bin").join("java.exe").is_file()
        && path.join("bin").join("javac.exe").is_file()
}

pub(crate) fn fingerprint_environment(envs: &HashMap<String, String>) -> String {
    let mut pairs = envs.iter().collect::<Vec<_>>();
    pairs.sort_by(|a, b| a.0.cmp(b.0));
    let mut hasher = sha2::Sha256::new();
    use sha2::Digest;
    for (key, value) in pairs {
        hasher.update(key.as_bytes());
        hasher.update([0]);
        hasher.update(value.as_bytes());
        hasher.update([0]);
    }
    format!("{:x}", hasher.finalize())
}

pub(crate) fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建目录失败：{err}"))?;
    }
    let text = serde_json::to_string_pretty(value).map_err(|err| format!("序列化失败：{err}"))?;
    fs::write(path, text).map_err(|err| format!("写入文件失败：{err}"))
}

pub(crate) fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let text = fs::read_to_string(path).map_err(|err| format!("读取文件失败：{err}"))?;
    serde_json::from_str(&text).map_err(|err| format!("解析 JSON 失败：{err}"))
}
