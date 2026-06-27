use super::*;

pub fn export_env_reliability_report(
    managed_root: &Path,
    format: String,
) -> Result<String, String> {
    let report = super::snapshot::inspect_env_reliability(managed_root);
    let reports = app_config_dir().join("reports");
    fs::create_dir_all(&reports).map_err(|err| format!("创建报告目录失败：{err}"))?;
    let path = reports.join(format!(
        "env-reliability-{}.{}",
        now_string(),
        if format == "json" { "json" } else { "md" }
    ));
    let text = if format == "json" {
        serde_json::to_string_pretty(&report).map_err(|err| format!("生成 JSON 失败：{err}"))?
    } else {
        format!(
            "# 环境可靠性报告\n\n- 生成时间：{}\n- Java 一致性：{}\n- Python 冲突：{} 项\n- PATH 条目：{}\n\n## 风险与限制\n\n- 本报告基于当前扫描时刻生成，环境可能已经变化。\n- 执行修改类操作前请重新扫描并确认。\n- 当前进程可能仍保留旧环境；新终端通常会读取最新用户环境。\n- IDE、服务、Nacos、Maven Daemon、Gradle Daemon 可能需要重启。\n",
            report.generated_at,
            report.java.consistency,
            report.python.conflicts.len(),
            report.path_analysis.total_entries
        )
    };
    fs::write(&path, text).map_err(|err| format!("写入报告失败：{err}"))?;
    Ok(display_path(path))
}
