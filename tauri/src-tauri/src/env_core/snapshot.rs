use super::java::inspect_java_reliability;
use super::maven_gradle::inspect_maven_gradle_reliability;
use super::node::inspect_node_reliability;
use super::path_rules::{is_devenv_managed_entry, is_stale_devenv_entry, path_too_long};
use super::python::inspect_python_reliability;
use super::resolver::probe;
use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvReliabilitySnapshot {
    pub generated_at: String,
    pub process_env: EnvLayerSnapshot,
    pub user_env: EnvLayerSnapshot,
    pub effective_tools: EffectiveToolSnapshot,
    pub path_analysis: PathAnalysis,
    pub java: JavaEnvReliability,
    pub python: PythonEnvReliability,
    pub node: NodeEnvReliability,
    pub maven_gradle: MavenGradleReliability,
    pub issues: Vec<EnvIssue>,
    pub suggestions: Vec<EnvSuggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvLayerSnapshot {
    pub java_home_raw: Option<String>,
    pub java_home_expanded: Option<String>,
    pub devenv_home_raw: Option<String>,
    pub devenv_home_expanded: Option<String>,
    pub path_raw: String,
    pub path_entries: Vec<PathEntryInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PathEntryInfo {
    pub raw: String,
    pub expanded: String,
    pub exists: bool,
    pub source: String,
    pub contains_java: bool,
    pub contains_javac: bool,
    pub contains_python: bool,
    pub contains_pip: bool,
    pub contains_node: bool,
    pub contains_npm: bool,
    pub is_devenv_managed: bool,
    pub is_stale_devenv_entry: bool,
    pub is_duplicate: bool,
    pub risk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PathAnalysis {
    pub total_entries: usize,
    pub duplicate_count: usize,
    pub missing_count: usize,
    pub stale_devenv_count: usize,
    pub java_entry_count: usize,
    pub python_entry_count: usize,
    pub store_alias_detected: bool,
    pub path_too_long: bool,
    pub explanation: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveToolSnapshot {
    pub java: ToolProbe,
    pub javac: ToolProbe,
    pub python: ToolProbe,
    pub pip: ToolProbe,
    pub node: ToolProbe,
    pub npm: ToolProbe,
    pub maven: ToolProbe,
    pub gradle: ToolProbe,
    pub go: ToolProbe,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ToolProbe {
    pub path: Option<String>,
    pub version: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCandidate {
    pub path: String,
    pub version: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvIssue {
    pub id: String,
    pub title: String,
    pub severity: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvSuggestion {
    pub id: String,
    pub title: String,
    pub detail: String,
    pub action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExpectedEnvState {
    pub java_home: Option<String>,
    pub devenv_home: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct JavaEnvReliability {
    pub java_home_raw: Option<String>,
    pub java_home_expanded: Option<String>,
    pub java_home_valid: bool,
    pub java_home_java: Option<String>,
    pub java_home_javac: Option<String>,
    pub path_java: Option<String>,
    pub path_javac: Option<String>,
    pub command_java_version: String,
    pub command_javac_version: String,
    pub effective_jdk_path: Option<String>,
    pub effective_jdk_version: Option<String>,
    pub consistency: String,
    pub conflicts: Vec<String>,
    pub candidates: Vec<RuntimeCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PythonEnvReliability {
    pub current_python: Option<ToolProbe>,
    pub current_pip: Option<ToolProbe>,
    pub py_launcher_output: String,
    pub discovered_pythons: Vec<RuntimeCandidate>,
    pub discovered_pips: Vec<RuntimeCandidate>,
    pub store_alias_risk: bool,
    pub pip_matches_python: bool,
    pub user_path_effective: bool,
    pub conflicts: Vec<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeEnvReliability {
    pub node_path: Option<String>,
    pub node_version: String,
    pub npm_path: Option<String>,
    pub npm_version: String,
    pub npx_path: Option<String>,
    pub corepack_status: String,
    pub npm_prefix: String,
    pub npm_registry: String,
    pub pnpm_store: String,
    pub conflicts: Vec<String>,
    pub suggestions: Vec<String>,
}

pub fn inspect_env_reliability(managed_root: &Path) -> EnvReliabilitySnapshot {
    let user = user_environment().unwrap_or_default();
    let process = process_environment();
    let user_layer = layer_snapshot(&user, managed_root, "用户环境");
    let process_layer = layer_snapshot(&process, managed_root, "当前进程");
    let path_analysis = analyze_path(&user_layer.path_raw, &user, managed_root);
    let effective_tools = effective_tools(&user, managed_root);
    let java = inspect_java_reliability(managed_root, &user);
    let python = inspect_python_reliability(managed_root, &user, &process);
    let node = inspect_node_reliability(managed_root, &user);
    let maven_gradle =
        inspect_maven_gradle_reliability(managed_root, &user, java.java_home_expanded.as_deref());
    let mut issues = Vec::new();
    let mut suggestions = Vec::new();
    for conflict in &java.conflicts {
        issues.push(EnvIssue {
            id: format!("java-{}", issues.len() + 1),
            title: "Java 生效链不一致".to_string(),
            severity: if conflict.contains("不存在") || conflict.contains("bin 目录") {
                "critical"
            } else {
                "warning"
            }
            .to_string(),
            detail: conflict.clone(),
        });
    }
    for conflict in &python.conflicts {
        issues.push(EnvIssue {
            id: format!("python-{}", issues.len() + 1),
            title: "Python / pip 可能不一致".to_string(),
            severity: "warning".to_string(),
            detail: conflict.clone(),
        });
    }
    if path_analysis.stale_devenv_count > 0 || path_analysis.duplicate_count > 0 {
        suggestions.push(EnvSuggestion {
            id: "path-repair".to_string(),
            title: "生成 PATH 修复计划".to_string(),
            detail: "只移动、去重或清理 DevEnv Manager 受管条目；不会删除未知用户 PATH。"
                .to_string(),
            action: Some("create_env_plan".to_string()),
        });
    }
    if !java.java_home_valid {
        suggestions.push(EnvSuggestion {
            id: "java-stabilize".to_string(),
            title: "生成 Java 稳定修复计划".to_string(),
            detail: "写入真实绝对 JAVA_HOME，并把受管 JDK bin 放到用户 PATH 前部。".to_string(),
            action: Some("java_stabilize".to_string()),
        });
    }
    EnvReliabilitySnapshot {
        generated_at: now_string(),
        process_env: process_layer,
        user_env: user_layer,
        effective_tools,
        path_analysis,
        java,
        python,
        node,
        maven_gradle,
        issues,
        suggestions,
    }
}

fn layer_snapshot(
    envs: &HashMap<String, String>,
    managed_root: &Path,
    source: &str,
) -> EnvLayerSnapshot {
    let java_home_raw = envs.get("JAVA_HOME").cloned();
    let devenv_home_raw = envs.get("DEVENV_HOME").cloned();
    let path_raw = envs
        .get("Path")
        .or_else(|| envs.get("PATH"))
        .cloned()
        .unwrap_or_default();
    EnvLayerSnapshot {
        java_home_expanded: java_home_raw
            .as_deref()
            .map(|value| expand_env_value(value, envs, managed_root)),
        devenv_home_expanded: devenv_home_raw
            .as_deref()
            .map(|value| expand_env_value(value, envs, managed_root)),
        java_home_raw,
        devenv_home_raw,
        path_entries: path_entries(&path_raw, envs, managed_root, source),
        path_raw,
    }
}

fn path_entries(
    path_raw: &str,
    envs: &HashMap<String, String>,
    managed_root: &Path,
    source: &str,
) -> Vec<PathEntryInfo> {
    let mut seen = BTreeSet::new();
    split_path(path_raw)
        .into_iter()
        .map(|raw| {
            let expanded = expand_env_value(&raw, envs, managed_root);
            let path = PathBuf::from(&expanded);
            let is_duplicate = !seen.insert(path_key(&raw));
            let contains = |name: &str| path.join(name).is_file();
            let is_stale = is_stale_devenv_entry(&raw, &expanded, managed_root);
            let exists = path.exists();
            let risk = if is_stale {
                "medium"
            } else if is_duplicate || !exists {
                "low"
            } else {
                "info"
            };
            PathEntryInfo {
                raw,
                expanded: expanded.clone(),
                exists,
                source: source.to_string(),
                contains_java: contains("java.exe"),
                contains_javac: contains("javac.exe"),
                contains_python: contains("python.exe"),
                contains_pip: contains("pip.exe"),
                contains_node: contains("node.exe"),
                contains_npm: contains("npm.cmd") || contains("npm.exe"),
                is_devenv_managed: is_devenv_managed_entry(&expanded, &expanded, managed_root),
                is_stale_devenv_entry: is_stale,
                is_duplicate,
                risk: risk.to_string(),
            }
        })
        .collect()
}

fn analyze_path(
    path_raw: &str,
    envs: &HashMap<String, String>,
    managed_root: &Path,
) -> PathAnalysis {
    let entries = path_entries(path_raw, envs, managed_root, "用户环境");
    let java_entry_count = entries.iter().filter(|item| item.contains_java).count();
    let python_entry_count = entries.iter().filter(|item| item.contains_python).count();
    let mut explanation = vec![
        "当前进程环境来自 DevEnv Manager 启动时；用户环境是新终端通常会读取的注册表值。"
            .to_string(),
        "已经打开的终端、IDE、服务进程通常不会自动刷新用户环境。".to_string(),
    ];
    if java_entry_count > 1 {
        explanation.push("PATH 中存在多个 java.exe，实际命中取决于 PATH 顺序。".to_string());
    }
    if python_entry_count > 1 {
        explanation
            .push("PATH 中存在多个 python.exe，pip 与 python 可能不属于同一版本。".to_string());
    }
    PathAnalysis {
        total_entries: entries.len(),
        duplicate_count: entries.iter().filter(|item| item.is_duplicate).count(),
        missing_count: entries.iter().filter(|item| !item.exists).count(),
        stale_devenv_count: entries
            .iter()
            .filter(|item| item.is_stale_devenv_entry)
            .count(),
        java_entry_count,
        python_entry_count,
        store_alias_detected: entries
            .iter()
            .any(|item| item.expanded.to_ascii_lowercase().contains("\\windowsapps")),
        path_too_long: path_too_long(path_raw),
        explanation,
    }
}

fn effective_tools(envs: &HashMap<String, String>, managed_root: &Path) -> EffectiveToolSnapshot {
    let to_probe = |tool: super::resolver::ResolvedTool| ToolProbe {
        path: tool.path,
        version: tool.version,
        source: tool.source,
    };
    EffectiveToolSnapshot {
        java: to_probe(probe("java", &["-version"], envs, managed_root)),
        javac: to_probe(probe("javac", &["-version"], envs, managed_root)),
        python: to_probe(probe("python", &["--version"], envs, managed_root)),
        pip: to_probe(probe("pip", &["--version"], envs, managed_root)),
        node: to_probe(probe("node", &["-v"], envs, managed_root)),
        npm: to_probe(probe("npm", &["-v"], envs, managed_root)),
        maven: to_probe(probe("mvn", &["-version"], envs, managed_root)),
        gradle: to_probe(probe("gradle", &["--version"], envs, managed_root)),
        go: to_probe(probe("go", &["version"], envs, managed_root)),
    }
}
