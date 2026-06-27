use super::path_rules::{merge_path_with_policy, PathRepairPolicy};
use super::plan::{create_env_repair_plan, EnvRepairOptions, EnvRepairPlan};
use super::resolver::classify_source;
use super::snapshot::{JavaEnvReliability, RuntimeCandidate};
use super::*;
use serde::{Deserialize, Serialize};

pub fn inspect_java_reliability(
    managed_root: &Path,
    user: &HashMap<String, String>,
) -> JavaEnvReliability {
    let java_home_raw = user.get("JAVA_HOME").cloned();
    let java_home_expanded = java_home_raw
        .as_deref()
        .map(|value| expand_env_value(value, user, managed_root));
    let java_home_path = java_home_expanded.as_deref().map(PathBuf::from);
    let java_home_java = java_home_path
        .as_ref()
        .map(|path| path.join("bin/java.exe"))
        .filter(|path| path.is_file());
    let java_home_javac = java_home_path
        .as_ref()
        .map(|path| path.join("bin/javac.exe"))
        .filter(|path| path.is_file());
    let path_value = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let path_java = find_in_path("java", &path_value, user, managed_root);
    let path_javac = find_in_path("javac", &path_value, user, managed_root);
    let command_java_version = path_java
        .as_deref()
        .map(|path| run_command(path, &["-version"]))
        .unwrap_or_default();
    let command_javac_version = path_javac
        .as_deref()
        .map(|path| run_command(path, &["-version"]))
        .unwrap_or_default();
    let java_home_valid = java_home_path.as_deref().is_some_and(is_java_home_root);
    let mut conflicts = Vec::new();
    if let Some(raw) = &java_home_raw {
        if raw.contains('%') {
            conflicts.push(
                "JAVA_HOME 是间接引用；部分程序不会二次展开，建议写入真实绝对路径。".to_string(),
            );
        }
        if raw
            .replace('/', "\\")
            .to_ascii_lowercase()
            .ends_with("\\bin")
        {
            conflicts.push("JAVA_HOME 指向了 bin 目录；应指向 JDK 根目录。".to_string());
        }
    } else {
        conflicts.push("JAVA_HOME 未设置。".to_string());
    }
    if java_home_path.is_some() && java_home_java.is_none() {
        conflicts.push("JAVA_HOME\\bin\\java.exe 不存在。".to_string());
    }
    if java_home_path.is_some() && java_home_javac.is_none() {
        conflicts.push("JAVA_HOME\\bin\\javac.exe 不存在；可能是 JRE 或残缺 JDK。".to_string());
    }
    if let (Some(home), Some(java)) = (&java_home_path, &path_java) {
        if java
            .parent()
            .and_then(Path::parent)
            .is_some_and(|root| path_key(&display_path(root)) != path_key(&display_path(home)))
        {
            conflicts.push("PATH 首个 java.exe 不属于 JAVA_HOME。".to_string());
        }
    }
    if let (Some(home), Some(javac)) = (&java_home_path, &path_javac) {
        if javac
            .parent()
            .and_then(Path::parent)
            .is_some_and(|root| path_key(&display_path(root)) != path_key(&display_path(home)))
        {
            conflicts.push("PATH 首个 javac.exe 不属于 JAVA_HOME。".to_string());
        }
    }
    let effective_jdk_path = java_home_path
        .as_ref()
        .filter(|path| path.is_dir())
        .map(display_path)
        .or_else(|| {
            path_java
                .as_ref()
                .and_then(|path| path.parent()?.parent())
                .map(display_path)
        });
    let effective_jdk_version = if !command_java_version.is_empty() {
        command_java_version.lines().next().map(str::to_string)
    } else {
        None
    };
    JavaEnvReliability {
        java_home_raw,
        java_home_expanded,
        java_home_valid,
        java_home_java: java_home_java.as_deref().map(display_path),
        java_home_javac: java_home_javac.as_deref().map(display_path),
        path_java: path_java.as_deref().map(display_path),
        path_javac: path_javac.as_deref().map(display_path),
        command_java_version,
        command_javac_version,
        effective_jdk_path,
        effective_jdk_version,
        consistency: if conflicts.is_empty() {
            "ok"
        } else if conflicts
            .iter()
            .any(|item| item.contains("不存在") || item.contains("bin 目录"))
        {
            "critical"
        } else {
            "warning"
        }
        .to_string(),
        conflicts,
        candidates: discover_java_candidates(managed_root, user),
    }
}

fn discover_java_candidates(
    managed_root: &Path,
    user: &HashMap<String, String>,
) -> Vec<RuntimeCandidate> {
    let path_value = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let mut seen = BTreeSet::new();
    let mut result = Vec::new();
    for java in all_in_path("java", &path_value, user, managed_root) {
        let Some(root) = java.parent().and_then(Path::parent) else {
            continue;
        };
        if seen.insert(path_key(&display_path(root))) {
            result.push(RuntimeCandidate {
                path: display_path(root),
                version: run_command(&java, &["-version"])
                    .lines()
                    .next()
                    .unwrap_or("")
                    .to_string(),
                source: classify_source(root, managed_root),
            });
        }
    }
    let managed = managed_root.join("current").join("jdk");
    if managed.join("bin/java.exe").is_file() && seen.insert(path_key(&display_path(&managed))) {
        result.push(RuntimeCandidate {
            version: run_command(&managed.join("bin/java.exe"), &["-version"])
                .lines()
                .next()
                .unwrap_or("")
                .to_string(),
            source: "DevEnv Manager current".to_string(),
            path: display_path(managed),
        });
    }
    result
}

pub fn create_java_stabilize_plan(
    managed_root: &Path,
    jdk_path: String,
) -> Result<EnvRepairPlan, String> {
    let jdk = PathBuf::from(jdk_path);
    if jdk.to_string_lossy().contains('%') {
        return Err(
            "JAVA_HOME 不允许写入 %DEVENV_HOME% 等间接引用，请选择真实绝对 JDK 路径".to_string(),
        );
    }
    if jdk.file_name().and_then(|value| value.to_str()) == Some("bin") {
        return Err("JAVA_HOME 不能指向 bin 目录，请选择 JDK 根目录".to_string());
    }
    if !jdk.join("bin/java.exe").is_file() {
        return Err("目标目录缺少 bin\\java.exe".to_string());
    }
    if !jdk.join("bin/javac.exe").is_file() {
        return Err("目标目录缺少 bin\\javac.exe；JRE 或残缺 JDK 不能作为 JAVA_HOME".to_string());
    }
    create_env_repair_plan(
        managed_root,
        "java".to_string(),
        EnvRepairOptions {
            target_java_home: Some(display_path(jdk)),
            repair_path: true,
            remove_stale_devenv_entries: true,
        },
    )
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct JavaVerificationReport {
    pub success: bool,
    pub java_home: Option<String>,
    pub java_version: String,
    pub javac_version: String,
    pub maven_version: String,
    pub gradle_version: String,
    pub warnings: Vec<String>,
}

pub fn verify_java_toolchain(managed_root: &Path) -> JavaVerificationReport {
    let user = user_environment().unwrap_or_default();
    let java = inspect_java_reliability(managed_root, &user);
    let path = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let maven = find_in_path("mvn", &path, &user, managed_root)
        .map(|path| run_command(&path, &["-version"]))
        .unwrap_or_default();
    let gradle = find_in_path("gradle", &path, &user, managed_root)
        .map(|path| run_command(&path, &["--version"]))
        .unwrap_or_default();
    JavaVerificationReport {
        success: java.java_home_valid
            && java
                .conflicts
                .iter()
                .all(|item| !item.contains("不存在") && !item.contains("bin 目录")),
        java_home: java.java_home_expanded,
        java_version: java.command_java_version,
        javac_version: java.command_javac_version,
        maven_version: maven,
        gradle_version: gradle,
        warnings: java.conflicts,
    }
}

pub(crate) fn proposed_path_with_jdk(
    managed_root: &Path,
    user: &HashMap<String, String>,
) -> String {
    let current = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    merge_path_with_policy(&current, managed_root, user, &PathRepairPolicy::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn java_home_rejects_indirect_reference() {
        let root = tempfile::tempdir().unwrap();
        let result =
            create_java_stabilize_plan(root.path(), r"%DEVENV_HOME%\current\jdk".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn java_home_rejects_bin_directory() {
        let root = tempfile::tempdir().unwrap();
        let jdk = root.path().join("jdk");
        fs::create_dir_all(jdk.join("bin")).unwrap();
        fs::write(jdk.join("bin/java.exe"), []).unwrap();
        fs::write(jdk.join("bin/javac.exe"), []).unwrap();
        let result = create_java_stabilize_plan(root.path(), display_path(jdk.join("bin")));
        assert!(result.is_err());
    }

    #[test]
    fn java_home_rejects_missing_javac() {
        let root = tempfile::tempdir().unwrap();
        let jdk = root.path().join("jdk");
        fs::create_dir_all(jdk.join("bin")).unwrap();
        fs::write(jdk.join("bin/java.exe"), []).unwrap();
        let result = create_java_stabilize_plan(root.path(), display_path(jdk));
        assert!(result.is_err());
    }
}
