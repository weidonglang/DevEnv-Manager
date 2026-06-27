use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTool {
    pub name: String,
    pub path: Option<String>,
    pub version: String,
    pub source: String,
}

pub(crate) fn probe(
    executable: &str,
    args: &[&str],
    envs: &HashMap<String, String>,
    managed_root: &Path,
) -> ResolvedTool {
    let path_value = envs
        .get("Path")
        .or_else(|| envs.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let path = find_in_path(executable, &path_value, envs, managed_root);
    let version = path
        .as_deref()
        .map(|candidate| run_command(candidate, args))
        .unwrap_or_default();
    ResolvedTool {
        name: executable.to_string(),
        path: path.as_deref().map(display_path),
        version: version
            .lines()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("")
            .trim()
            .to_string(),
        source: path
            .as_deref()
            .map(|candidate| classify_source(candidate, managed_root))
            .unwrap_or_else(|| "未发现".to_string()),
    }
}

pub(crate) fn classify_source(path: &Path, managed_root: &Path) -> String {
    let key = path_key(&display_path(path));
    if key.starts_with(&path_key(&display_path(managed_root))) {
        "DevEnv Manager 受管".to_string()
    } else if key.contains("\\scoop\\") {
        "Scoop".to_string()
    } else if key.contains("\\chocolatey\\") {
        "Chocolatey".to_string()
    } else if key.contains("\\jetbrains\\") || key.contains("\\intellij") || key.contains("\\idea")
    {
        "IDE 内置".to_string()
    } else if key.contains("\\windowsapps\\") {
        "Microsoft Store Alias".to_string()
    } else {
        "外部 PATH".to_string()
    }
}
