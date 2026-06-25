use super::disk::inspect_disk_overview;
use super::model::{ExpansionPlan, ExpansionResult};
use super::partition::inspect_partition_layout;
use super::utils::generated_at;
use std::process::Command;

pub fn create_c_drive_expansion_plan() -> Result<ExpansionPlan, String> {
    let report = inspect_partition_layout()?;
    let mut risks = vec!["分区操作前必须完成离线备份；执行时不要断电。".to_string()];
    if report.bitlocker_suspected {
        risks.push("疑似 BitLocker/设备加密启用，请先暂停保护。".to_string());
    }
    if report.can_extend_safely {
        let added = report.unallocated_after_c.unwrap_or(0);
        Ok(ExpansionPlan {
            plan_id: format!("expand-{}", generated_at()),
            mode: "safe_extend_unallocated".to_string(),
            can_execute: true,
            requires_admin: true,
            estimated_added_bytes: added,
            commands_preview: vec![
                "diskpart".to_string(),
                "select volume C".to_string(),
                "extend".to_string(),
            ],
            risks,
            backup_required: true,
            explanation: "C 盘右侧紧邻未分配空间，满足安全扩展条件；仍需要管理员权限与三次确认。"
                .to_string(),
        })
    } else if report.can_delete_empty_adjacent_partition {
        let adjacent = report.adjacent_right.clone().unwrap_or_default();
        risks.push("将删除 C 盘右侧空分区；仅当确认没有用户文件时才可继续。".to_string());
        Ok(ExpansionPlan {
            plan_id: format!("expand-{}", generated_at()),
            mode: "delete_empty_adjacent_partition_then_extend".to_string(),
            can_execute: true,
            requires_admin: true,
            estimated_added_bytes: adjacent.size,
            commands_preview: vec![
                "diskpart".to_string(),
                format!("select disk {}", report.system_disk),
                format!("select partition {}", adjacent.partition_index),
                "delete partition override".to_string(),
                "select volume C".to_string(),
                "extend".to_string(),
            ],
            risks,
            backup_required: true,
            explanation: "C 盘右侧是空分区，理论上可删除后扩展；该模式必须三次确认。".to_string(),
        })
    } else {
        let mode = if report.recovery_partition_blocks {
            "blocked_by_recovery_partition"
        } else if report.d_partition_same_disk {
            "d_drive_not_adjacent_or_has_data"
        } else {
            "different_physical_disk"
        };
        Ok(ExpansionPlan {
            plan_id: format!("expand-{}", generated_at()),
            mode: mode.to_string(),
            can_execute: false,
            requires_admin: false,
            estimated_added_bytes: 0,
            commands_preview: Vec::new(),
            risks,
            backup_required: true,
            explanation: report.explanation,
        })
    }
}

fn c_drive_totals() -> (u64, u64) {
    inspect_disk_overview()
        .unwrap_or_default()
        .into_iter()
        .find(|item| item.drive.eq_ignore_ascii_case("C:"))
        .map(|item| (item.total_bytes, item.free_bytes))
        .unwrap_or_default()
}

pub fn execute_c_drive_expansion(plan: ExpansionPlan) -> ExpansionResult {
    let (before_total, before_free) = c_drive_totals();
    let mut result = ExpansionResult {
        plan_id: plan.plan_id.clone(),
        before_free,
        before_total,
        ..ExpansionResult::default()
    };
    if !plan.can_execute
        || !matches!(
            plan.mode.as_str(),
            "safe_extend_unallocated" | "delete_empty_adjacent_partition_then_extend"
        )
    {
        result.output = "该扩容计划不可执行，只能作为说明报告。".to_string();
        result.report_markdown = expansion_report(&plan, &result);
        return result;
    }
    #[cfg(windows)]
    {
        let script = if plan.mode == "safe_extend_unallocated" {
            "select volume C\r\nextend\r\nexit\r\n".to_string()
        } else {
            let partition = plan
                .commands_preview
                .iter()
                .find_map(|line| line.strip_prefix("select partition "))
                .unwrap_or("");
            let disk = plan
                .commands_preview
                .iter()
                .find_map(|line| line.strip_prefix("select disk "))
                .unwrap_or("");
            if disk.is_empty() || partition.is_empty() {
                result.output = "扩容计划缺少磁盘或分区编号，已拒绝执行。".to_string();
                result.report_markdown = expansion_report(&plan, &result);
                return result;
            }
            format!("select disk {disk}\r\nselect partition {partition}\r\ndelete partition override\r\nselect volume C\r\nextend\r\nexit\r\n")
        };
        let mut child = Command::new("diskpart.exe")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();
        match child.as_mut() {
            Ok(process) => {
                if let Some(stdin) = process.stdin.as_mut() {
                    use std::io::Write;
                    let _ = stdin.write_all(script.as_bytes());
                }
                match child.unwrap().wait_with_output() {
                    Ok(output) => {
                        result.success = output.status.success();
                        result.output = format!(
                            "{}{}",
                            String::from_utf8_lossy(&output.stdout),
                            String::from_utf8_lossy(&output.stderr)
                        );
                    }
                    Err(err) => result.output = format!("执行 diskpart 失败：{err}"),
                }
            }
            Err(err) => result.output = format!("启动 diskpart 失败：{err}"),
        }
    }
    #[cfg(not(windows))]
    {
        result.output = "C 盘扩容仅支持 Windows".to_string();
    }
    let (after_total, after_free) = c_drive_totals();
    result.after_total = after_total;
    result.after_free = after_free;
    result.report_markdown = expansion_report(&plan, &result);
    result
}

fn expansion_report(plan: &ExpansionPlan, result: &ExpansionResult) -> String {
    format!(
        "# C 盘扩容报告\n\n- 计划：{}\n- 模式：{}\n- 可执行：{}\n- 成功：{}\n- 扩容前总量：{}\n- 扩容后总量：{}\n- 输出：\n\n```text\n{}\n```",
        plan.plan_id,
        plan.mode,
        plan.can_execute,
        result.success,
        result.before_total,
        result.after_total,
        result.output
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_executable_plan_will_not_run() {
        let result = execute_c_drive_expansion(ExpansionPlan {
            mode: "blocked_by_recovery_partition".to_string(),
            can_execute: false,
            ..ExpansionPlan::default()
        });
        assert!(!result.success);
        assert!(result.output.contains("不可执行"));
    }
}
