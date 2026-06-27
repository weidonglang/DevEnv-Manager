use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MavenGradleReliability {
    pub maven_path: Option<String>,
    pub maven_version: String,
    pub maven_java: String,
    pub gradle_path: Option<String>,
    pub gradle_version: String,
    pub gradle_java: String,
    pub conflicts: Vec<String>,
    pub suggestions: Vec<String>,
}

pub fn inspect_maven_gradle_reliability(
    managed_root: &Path,
    user: &HashMap<String, String>,
    java_home: Option<&str>,
) -> MavenGradleReliability {
    let path_value = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let maven = find_in_path("mvn", &path_value, user, managed_root);
    let gradle = find_in_path("gradle", &path_value, user, managed_root);
    let maven_output = maven
        .as_deref()
        .map(|path| run_command(path, &["-version"]))
        .unwrap_or_default();
    let gradle_output = gradle
        .as_deref()
        .map(|path| run_command(path, &["--version"]))
        .unwrap_or_default();
    let maven_java = extract_java_line(&maven_output);
    let gradle_java = extract_java_line(&gradle_output);
    let mut conflicts = Vec::new();
    if java_home.is_some()
        && !maven_java.is_empty()
        && !maven_java
            .to_ascii_lowercase()
            .contains(&java_home.unwrap_or("").to_ascii_lowercase())
    {
        conflicts.push("Maven 使用的 Java 可能与 JAVA_HOME 不一致。".to_string());
    }
    if java_home.is_some()
        && !gradle_java.is_empty()
        && !gradle_java
            .to_ascii_lowercase()
            .contains(&java_home.unwrap_or("").to_ascii_lowercase())
    {
        conflicts.push(
            "Gradle 使用的 Java 可能与 JAVA_HOME 不一致；Gradle Daemon 可能需要重启。".to_string(),
        );
    }
    MavenGradleReliability {
        maven_path: maven.as_deref().map(display_path),
        maven_version: first_meaningful_line(&maven_output),
        maven_java,
        gradle_path: gradle.as_deref().map(display_path),
        gradle_version: first_meaningful_line(&gradle_output),
        gradle_java,
        conflicts,
        suggestions: vec!["Maven/Gradle 运行依赖当前 Java；切换 JDK 后建议重启终端、IDE、Maven Daemon 或 Gradle Daemon。".to_string()],
    }
}

fn first_meaningful_line(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.chars().all(|ch| ch == '-' || ch == '='))
        .unwrap_or("")
        .to_string()
}

fn extract_java_line(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .find(|line| {
            let lower = line.to_ascii_lowercase();
            lower.contains("java home") || lower.contains("jvm") || lower.starts_with("java:")
        })
        .unwrap_or("")
        .to_string()
}

pub fn repair_maven_gradle_registration(kind: String, path: String) -> Result<String, String> {
    let root = PathBuf::from(path);
    let exe = match kind.as_str() {
        "maven" => root.join("bin").join("mvn.cmd"),
        "gradle" => root.join("bin").join("gradle.bat"),
        _ => return Err("只支持 maven 或 gradle".to_string()),
    };
    if !root.is_dir() {
        return Err("工具目录不存在".to_string());
    }
    if !exe.is_file() {
        return Err(format!("缺少可执行文件：{}", display_path(exe)));
    }
    Ok(format!(
        "{} 目录可重新登记：{}。GUI 安装按钮会执行登记、切换 current 和验证；不会覆盖已有目录。",
        kind,
        display_path(root)
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gradle_parser_skips_separator_lines() {
        assert_eq!(
            first_meaningful_line(
                "------------------------------------------------------------\nGradle 9.0\n"
            ),
            "Gradle 9.0"
        );
    }
}
