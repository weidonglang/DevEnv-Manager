pub fn diff_text(
    old_java: Option<&str>,
    new_java: Option<&str>,
    old_path: Option<&str>,
    new_path: Option<&str>,
) -> Vec<String> {
    let mut lines = Vec::new();
    if old_java != new_java {
        lines.push(format!(
            "JAVA_HOME: {} -> {}",
            old_java.unwrap_or("未设置"),
            new_java.unwrap_or("不设置")
        ));
    }
    if old_path != new_path {
        let old_count = old_path
            .unwrap_or("")
            .split(';')
            .filter(|item| !item.trim().is_empty())
            .count();
        let new_count = new_path
            .unwrap_or("")
            .split(';')
            .filter(|item| !item.trim().is_empty())
            .count();
        lines.push(format!("PATH 条目数量: {old_count} -> {new_count}"));
    }
    lines
}
