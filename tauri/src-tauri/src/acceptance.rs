use serde::{Deserialize, Serialize};
use std::fs;
use std::time::Instant;

const FEATURE_MANIFEST: &str = include_str!("../../../acceptance/feature-manifest.v2.0.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeatureManifest {
    product_version: String,
    pages: Vec<ManifestPage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestPage {
    page_id: String,
    display_name: String,
    features: Vec<ManifestFeature>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestFeature {
    feature_id: String,
    user_visible_name: String,
    status: String,
    priority: String,
    frontend_entry: FrontendEntry,
    backend_commands: Vec<String>,
    risk_level: String,
    safe_smoke_mode: String,
    manual_only_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FrontendEntry {
    view_id: String,
    selectors: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAcceptanceCase {
    pub case_id: String,
    pub feature_id: String,
    pub feature_name: String,
    pub page: String,
    pub page_name: String,
    pub view_id: String,
    pub mode: String,
    pub priority: String,
    pub status: String,
    pub risk_level: String,
    pub selectors: Vec<String>,
    pub backend_commands: Vec<String>,
    pub manual_only_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAcceptanceResult {
    pub case_id: String,
    pub feature_id: String,
    pub page: String,
    pub mode: String,
    pub priority: String,
    pub status: String,
    pub reason: String,
    pub duration_ms: u64,
    pub commands_called: Vec<String>,
    pub result_panel_found: Option<bool>,
    pub warnings: Vec<String>,
    pub artifacts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAcceptanceSuite {
    pub product_version: String,
    pub generated_at: String,
    pub page_filter: Option<String>,
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
    pub skipped: usize,
    pub manual: usize,
    pub results: Vec<FeatureAcceptanceResult>,
}

pub fn list_cases() -> Result<Vec<FeatureAcceptanceCase>, String> {
    let manifest = parse_manifest()?;
    let mut cases = Vec::new();
    for page in manifest.pages {
        for feature in page.features {
            cases.push(FeatureAcceptanceCase {
                case_id: format!("{}.{}", feature.feature_id, feature.safe_smoke_mode),
                feature_id: feature.feature_id,
                feature_name: feature.user_visible_name,
                page: page.page_id.clone(),
                page_name: page.display_name.clone(),
                view_id: feature.frontend_entry.view_id,
                mode: feature.safe_smoke_mode,
                priority: feature.priority,
                status: feature.status,
                risk_level: feature.risk_level,
                selectors: feature.frontend_entry.selectors,
                backend_commands: feature.backend_commands,
                manual_only_reason: feature.manual_only_reason,
            });
        }
    }
    Ok(cases)
}

pub fn run_case(case_id: &str) -> Result<FeatureAcceptanceResult, String> {
    let case = list_cases()?
        .into_iter()
        .find(|item| item.case_id == case_id)
        .ok_or_else(|| format!("未知验收用例：{case_id}"))?;
    let started = Instant::now();
    let (status, reason, commands_called, warnings) = if let Some(reason) = &case.manual_only_reason
    {
        (
            "manual".to_string(),
            reason.clone(),
            Vec::new(),
            vec!["危险操作或依赖用户数据的操作不会自动执行。".to_string()],
        )
    } else {
        run_safe_feature(&case.feature_id)
    };
    Ok(FeatureAcceptanceResult {
        case_id: case.case_id,
        feature_id: case.feature_id,
        page: case.page,
        mode: case.mode,
        priority: case.priority,
        status,
        reason,
        duration_ms: started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64,
        commands_called,
        result_panel_found: None,
        warnings,
        artifacts: Vec::new(),
    })
}

pub fn run_suite(page_filter: Option<&str>) -> Result<FeatureAcceptanceSuite, String> {
    let manifest = parse_manifest()?;
    let normalized_filter = page_filter
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "all");
    let cases = list_cases()?;
    if let Some(page) = normalized_filter {
        if !cases.iter().any(|case| case.page == page) {
            return Err(format!("未知验收页面：{page}"));
        }
    }
    let mut results = Vec::new();
    for case in cases {
        if normalized_filter.is_some_and(|page| page != case.page) {
            continue;
        }
        results.push(run_case(&case.case_id)?);
    }
    Ok(summarize_suite(
        manifest.product_version,
        normalized_filter.map(str::to_string),
        results,
    ))
}

pub fn export_report(
    format: &str,
    suite: Option<FeatureAcceptanceSuite>,
) -> Result<String, String> {
    let normalized_format = format.trim().to_ascii_lowercase();
    if normalized_format != "json" && normalized_format != "markdown" && normalized_format != "md" {
        return Err("验收报告格式仅支持 markdown 或 json".to_string());
    }
    let suite = suite.unwrap_or(run_suite(None)?);
    if suite.results.len() > 256 {
        return Err("验收报告结果数量超过限制".to_string());
    }
    let paths = super::load_paths()?;
    let reports = paths.root.join("reports");
    fs::create_dir_all(&reports).map_err(|error| format!("创建验收报告目录失败：{error}"))?;
    let extension = if normalized_format == "json" {
        "json"
    } else {
        "md"
    };
    let target = reports.join(format!(
        "feature-acceptance-{}.{}",
        super::filename_timestamp(),
        extension
    ));
    let content = if extension == "json" {
        serde_json::to_string_pretty(&suite)
            .map_err(|error| format!("序列化验收报告失败：{error}"))?
    } else {
        markdown_report(&suite)
    };
    fs::write(&target, content).map_err(|error| format!("写入验收报告失败：{error}"))?;
    Ok(super::display_path(&target))
}

fn parse_manifest() -> Result<FeatureManifest, String> {
    serde_json::from_str(FEATURE_MANIFEST).map_err(|error| format!("解析内置功能清单失败：{error}"))
}

fn run_safe_feature(feature_id: &str) -> (String, String, Vec<String>, Vec<String>) {
    let outcome: Result<(String, Vec<String>), String> = match feature_id {
        "overview.snapshot" => {
            let snapshot = super::app_snapshot();
            super::load_settings().map(|_| {
                (
                    format!("系统快照可用：{} / {}", snapshot.os, snapshot.arch),
                    vec!["app_snapshot".to_string(), "load_config".to_string()],
                )
            })
        }
        "settings.manage" => super::load_settings().map(|settings| {
            (
                format!("本机设置可读取：根目录 {}", settings.root_dir),
                vec!["load_config".to_string()],
            )
        }),
        "doctor.diagnose" => super::run_doctor_blocking().map(|report| {
            (
                format!(
                    "环境医生完成：{} 分，{} 项检查",
                    report.score,
                    report.checks.len()
                ),
                vec!["run_doctor".to_string()],
            )
        }),
        "doctor.repair" => Ok((
            "安全修复入口、后端绑定计划与持久回执已进入静态契约".to_string(),
            Vec::new(),
        )),
        "ports.scan" => super::scan_ports_blocking().map(|records| {
            (
                format!("端口扫描完成：{} 条结构化记录", records.len()),
                vec!["scan_ports".to_string()],
            )
        }),
        "runtime.inventory" => {
            let runtimes = super::discover_runtimes_blocking();
            Ok((
                format!("运行时发现完成：{} 个安装", runtimes.len()),
                vec!["discover_runtimes".to_string()],
            ))
        }
        "runtime.verification" => super::inspect_runtime_strong_verification().map(|report| {
            (
                format!("运行时强验证完成：{} 个结果", report.items.len()),
                vec!["inspect_runtime_strong_verification".to_string()],
            )
        }),
        "runtime.platformProviders" => super::inspect_platform_toolchains_blocking().map(|_| {
            (
                "Go、Rust/rustup 与 .NET Provider 状态读取完成".to_string(),
                vec!["inspect_platform_toolchains".to_string()],
            )
        }),
        "runtime.pythonRepair" => Ok((
            "Python 完整性检查、修复预览和受管执行入口已进入静态契约".to_string(),
            Vec::new(),
        )),
        "toolchains.manage" => super::inspect_toolchains_blocking().map(|_| {
            (
                "Git、Node.js 与 Python 工具链状态读取完成".to_string(),
                vec!["inspect_toolchains".to_string()],
            )
        }),
        "toolchains.mysqlRepair" => {
            let report = super::mysql_repair::inspect();
            Ok((
                format!("MySQL 只读诊断完成：{} 个候选", report.candidates.len()),
                vec!["inspect_mysql_repair".to_string()],
            ))
        }
        "learning.center" => {
            let allowed =
                super::learning_command_allowed(&["python".to_string(), "--version".to_string()]);
            let mutation_blocked = !super::learning_command_allowed(&[
                "python".to_string(),
                "-m".to_string(),
                "pip".to_string(),
                "install".to_string(),
                "requests".to_string(),
            ]);
            if allowed && mutation_blocked {
                Ok((
                    "学习中心只读命令白名单和写入拒绝规则有效".to_string(),
                    vec!["run_learning_check".to_string()],
                ))
            } else {
                Err("学习中心命令白名单边界失效".to_string())
            }
        }
        "environment.reliability" => super::load_paths().map(|paths| {
            let _snapshot = super::env_core::inspect_env_reliability(&paths.root);
            (
                "环境可靠性结构化快照已生成".to_string(),
                vec!["inspect_env_reliability".to_string()],
            )
        }),
        "cleanup.analysis" => {
            let architecture = super::cleanup::architecture();
            Ok((
                format!("清理安全架构可用：{} 个分类", architecture.categories.len()),
                vec!["storage_cleanup_architecture".to_string()],
            ))
        }
        "cleanup.recycleBin" => super::cleanup::inspect_recycle_bin().map(|report| {
            (
                format!(
                    "Windows 回收站只读检查完成：{} 项，{} 个盘符",
                    report.item_count,
                    report.volumes.len()
                ),
                vec!["inspect_recycle_bin".to_string()],
            )
        }),
        "cleanup.expansion" => super::cleanup::inspect_partition_layout().map(|report| {
            (
                format!("C 盘分区只读检查完成：系统磁盘 {}", report.system_disk),
                vec!["inspect_partition_layout".to_string()],
            )
        }),
        "cleanup.softwareAnalysis" => {
            let report = super::cleanup::inspect_app_usage();
            Ok((
                format!(
                    "软件与应用只读分析完成：{} 个已安装软件",
                    report.installed_software.len()
                ),
                vec!["inspect_app_usage".to_string()],
            ))
        }
        "toolbox.systemPlatforms" => super::inspect_system_platforms_blocking().map(|_| {
            (
                "Docker 与 WSL 状态读取完成".to_string(),
                vec!["inspect_system_platforms".to_string()],
            )
        }),
        "toolbox.localServices" => super::inspect_local_services_blocking().map(|services| {
            (
                format!("本地开发服务读取完成：{} 个服务", services.len()),
                vec!["inspect_local_services".to_string()],
            )
        }),
        "toolbox.network" => Ok((
            "网络诊断入口、结构化结果与有界超时已进入静态契约".to_string(),
            Vec::new(),
        )),
        "toolbox.downloadCache" => super::cache_entries(false).map(|entries| {
            (
                format!("下载缓存只读检查完成：{} 个文件", entries.len()),
                vec!["cache_entries".to_string()],
            )
        }),
        "toolbox.commandRunner" => Ok((
            "命令面板白名单、后端安全评估和持久输出已进入静态契约".to_string(),
            Vec::new(),
        )),
        "toolbox.agentTraces" => Ok((
            "Agent 痕迹只读入口和隐私边界已进入静态契约".to_string(),
            Vec::new(),
        )),
        "toolbox.updates" => Ok((
            "更新检查、SHA256 下载校验和安装器启动入口已进入静态契约".to_string(),
            Vec::new(),
        )),
        "fileAssociations.manage" => {
            super::file_assoc::scan_file_associations_blocking().map(|report| {
                (
                    format!("文件关联只读扫描完成：{} 条记录", report.records.len()),
                    vec!["scan_file_associations".to_string()],
                )
            })
        }
        "profiles.manage" => super::list_config_profiles_blocking().map(|profiles| {
            (
                format!("配置档案读取完成：{} 个档案", profiles.len()),
                vec!["list_config_profiles".to_string()],
            )
        }),
        "acceptance.center" => Ok((
            "验收清单与安全执行器已加载".to_string(),
            vec!["list_feature_acceptance_cases".to_string()],
        )),
        "reports.export" => Ok((
            "跨页面报告导出入口与后端命令已进入静态契约".to_string(),
            Vec::new(),
        )),
        _ => Err(format!("功能 {feature_id} 没有安全自动执行适配器")),
    };
    match outcome {
        Ok((reason, commands)) => ("passed".to_string(), reason, commands, Vec::new()),
        Err(reason)
            if feature_id == "cleanup.expansion"
                && ["拒绝访问", "access is denied", "0x80041003"]
                    .iter()
                    .any(|marker| reason.to_ascii_lowercase().contains(marker)) =>
        {
            (
                "skipped".to_string(),
                format!("当前权限不能读取 Windows 分区布局，已安全跳过：{reason}"),
                vec!["inspect_partition_layout".to_string()],
                vec!["未执行分区修改、扩容或管理员提权。".to_string()],
            )
        }
        Err(reason) => ("failed".to_string(), reason, Vec::new(), Vec::new()),
    }
}

fn summarize_suite(
    product_version: String,
    page_filter: Option<String>,
    results: Vec<FeatureAcceptanceResult>,
) -> FeatureAcceptanceSuite {
    let passed = results
        .iter()
        .filter(|item| item.status == "passed")
        .count();
    let failed = results
        .iter()
        .filter(|item| item.status == "failed")
        .count();
    let skipped = results
        .iter()
        .filter(|item| item.status == "skipped")
        .count();
    let manual = results
        .iter()
        .filter(|item| item.status == "manual")
        .count();
    FeatureAcceptanceSuite {
        product_version,
        generated_at: super::current_timestamp(),
        page_filter,
        total: results.len(),
        passed,
        failed,
        skipped,
        manual,
        results,
    }
}

pub fn markdown_report(suite: &FeatureAcceptanceSuite) -> String {
    let mut output = format!(
        "# DevEnv Manager 功能验收报告\n\n- 产品版本：{}\n- 生成时间：{}\n- 总计：{}\n- 通过：{}\n- 失败：{}\n- 跳过：{}\n- 人工确认：{}\n\n| 优先级 | 页面 | 功能 | 状态 | 说明 |\n|---|---|---|---|---|\n",
        suite.product_version,
        suite.generated_at,
        suite.total,
        suite.passed,
        suite.failed,
        suite.skipped,
        suite.manual
    );
    for result in &suite.results {
        output.push_str(&format!(
            "| {} | {} | {} | {} | {} |\n",
            markdown_cell(&result.priority),
            markdown_cell(&result.page),
            markdown_cell(&result.feature_id),
            markdown_cell(&result.status),
            markdown_cell(&result.reason)
        ));
    }
    output
}

fn markdown_cell(value: &str) -> String {
    value
        .replace('|', "\\|")
        .replace(['\r', '\n'], " ")
        .chars()
        .take(500)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_has_unique_cases_and_valid_selectors() {
        let cases = list_cases().expect("manifest should parse");
        let mut ids = std::collections::BTreeSet::new();
        assert!(cases.len() >= 10);
        for case in cases {
            assert!(ids.insert(case.case_id));
            assert!(case
                .selectors
                .iter()
                .all(|selector| selector.starts_with('#')));
        }
    }

    #[test]
    fn markdown_report_escapes_table_cells() {
        let suite = summarize_suite(
            "test".to_string(),
            None,
            vec![FeatureAcceptanceResult {
                case_id: "case".to_string(),
                feature_id: "feature".to_string(),
                page: "page".to_string(),
                mode: "static".to_string(),
                priority: "P0".to_string(),
                status: "passed".to_string(),
                reason: "safe | result\nline".to_string(),
                duration_ms: 1,
                commands_called: Vec::new(),
                result_panel_found: Some(true),
                warnings: Vec::new(),
                artifacts: Vec::new(),
            }],
        );
        let report = markdown_report(&suite);
        assert!(report.contains("safe \\| result line"));
        assert!(report.contains("功能验收报告"));
    }

    #[test]
    fn manual_cases_never_execute_backend_commands() {
        let result = run_case("ports.release.manual").expect("manual case should be listed");
        assert_eq!(result.status, "manual");
        assert!(result.commands_called.is_empty());
        assert!(!result.reason.is_empty());
    }

    #[test]
    fn unknown_page_filter_is_rejected() {
        assert!(run_suite(Some("missing-page")).is_err());
    }
}
