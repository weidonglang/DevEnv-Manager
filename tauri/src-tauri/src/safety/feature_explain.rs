use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureRiskInfo {
    pub feature_id: String,
    pub title: String,
    pub risk_level: String,
    pub what_it_does: Vec<String>,
    pub what_it_does_not_do: Vec<String>,
    pub possible_impact: Vec<String>,
    pub reversible: bool,
    pub requires_backup: bool,
    pub requires_admin: bool,
    pub confirmation_level: String,
    pub safe_alternatives: Vec<String>,
}

pub fn feature_risk_registry() -> Vec<FeatureRiskInfo> {
    vec![
        info("overview", "总览", "只读展示当前环境和运行时状态。"),
        info(
            "doctor",
            "环境医生",
            "只读诊断 PATH、JAVA_HOME、工具链、端口和缓存。",
        ),
        medium(
            "environment",
            "环境变量",
            "写入当前用户级 DEVENV_HOME、JAVA_HOME 和 PATH，写入前生成备份。",
        ),
        medium(
            "runtime-switch",
            "运行时切换",
            "切换 DevEnv Manager current 指针，并验证命令是否可用。",
        ),
        medium(
            "project",
            "项目启动向导",
            "备份后写入固定 VS Code/IDEA 配置文件。",
        ),
        medium(
            "toolchains",
            "工具链配置",
            "可写 npm/pip/Git/Go 等用户级配置，写入前需要确认。",
        ),
        medium(
            "ports",
            "端口管理",
            "可结束普通用户进程；系统关键进程会被拦截。",
        ),
        high(
            "docker-wsl",
            "Docker / WSL",
            "可启动、停止或安装 Docker Desktop / WSL 相关组件，执行前会说明影响范围。",
        ),
        high(
            "database-services",
            "数据库服务",
            "可启动、停止或重启本机数据库服务，可能影响正在连接的应用。",
        ),
        high(
            "mysql-repair",
            "MySQL 修复中心",
            "可能注册/启动服务或修复 Data 系统库，Data 操作前要求备份。",
        ),
        medium(
            "command-panel",
            "命令面板",
            "不是通用 Shell；安装/更新类命令需要确认，危险命令会被拒绝。",
        ),
        info(
            "learning",
            "学习中心",
            "只运行固定只读命令，不安装工具、不写环境变量。",
        ),
        medium(
            "cleanup",
            "C 盘专清",
            "只清理用户选择且后端验证通过的低风险项目。",
        ),
        info(
            "desktop-downloads",
            "桌面/下载整理",
            "只读统计桌面和下载目录占用，生成整理建议。",
        ),
        info(
            "large-files",
            "大文件/重复文件",
            "只读扫描文件大小和哈希，不删除文件。",
        ),
        info(
            "app-usage",
            "微信/QQ/浏览器/网盘占用",
            "只统计占用，不读取聊天内容、Cookie、密码或登录态。",
        ),
        info(
            "software-games",
            "软件/游戏空间分析",
            "只展示安装位置、占用估算、系统卸载入口和迁移建议。",
        ),
        high(
            "space-move",
            "空间搬家 / Junction",
            "移动白名单目录到非 C 盘目标，Junction 成功后写回滚记录。",
        ),
        info(
            "c-drive-expand-detect",
            "C 盘扩容检测",
            "只读解析分区布局、相邻空间、恢复分区和疑似 BitLocker 状态。",
        ),
        critical(
            "c-drive-expand",
            "C 盘扩容执行",
            "分区写操作可能导致数据丢失或系统无法启动，必须三次确认。",
        ),
        medium(
            "reports-rollback",
            "报告 / 回滚中心",
            "展示操作报告、备份记录和恢复入口，恢复操作需要确认。",
        ),
        medium(
            "env-rollback",
            "环境备份恢复",
            "恢复当前用户级环境变量，恢复前再备份当前状态。",
        ),
        info(
            "cli",
            "devenv CLI",
            "提供诊断、导出和受控计划入口；高风险执行需要确认参数。",
        ),
    ]
}

pub fn get_feature_risk(feature_id: String) -> Option<FeatureRiskInfo> {
    feature_risk_registry()
        .into_iter()
        .find(|item| item.feature_id == feature_id)
}

fn info(id: &str, title: &str, does: &str) -> FeatureRiskInfo {
    FeatureRiskInfo {
        feature_id: id.to_string(),
        title: title.to_string(),
        risk_level: "info".to_string(),
        what_it_does: vec![does.to_string()],
        what_it_does_not_do: vec!["不会修改系统级设置，也不会删除用户数据。".to_string()],
        possible_impact: vec!["基于当前扫描时刻，环境变化后需要重新检查。".to_string()],
        reversible: true,
        requires_backup: false,
        requires_admin: false,
        confirmation_level: "none".to_string(),
        safe_alternatives: vec!["只导出报告或复制诊断结果。".to_string()],
    }
}

fn medium(id: &str, title: &str, does: &str) -> FeatureRiskInfo {
    FeatureRiskInfo {
        risk_level: "medium".to_string(),
        confirmation_level: "double".to_string(),
        requires_backup: true,
        possible_impact: vec!["可能影响新终端、IDE、构建工具或正在运行的服务。".to_string()],
        ..info(id, title, does)
    }
}

fn high(id: &str, title: &str, does: &str) -> FeatureRiskInfo {
    FeatureRiskInfo {
        risk_level: "high".to_string(),
        confirmation_level: "double".to_string(),
        requires_backup: true,
        possible_impact: vec![
            "可能影响服务运行、数据位置或软件可用性，执行前请关闭相关程序并备份。".to_string(),
        ],
        ..info(id, title, does)
    }
}

fn critical(id: &str, title: &str, does: &str) -> FeatureRiskInfo {
    FeatureRiskInfo {
        risk_level: "critical".to_string(),
        confirmation_level: "triple".to_string(),
        requires_backup: true,
        requires_admin: true,
        reversible: false,
        possible_impact: vec![
            "可能影响磁盘分区、系统启动或数据恢复能力，不理解时不要执行。".to_string(),
        ],
        ..info(id, title, does)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn major_pages_have_feature_help() {
        let ids = feature_risk_registry()
            .into_iter()
            .map(|item| item.feature_id)
            .collect::<std::collections::BTreeSet<_>>();
        for id in [
            "overview",
            "doctor",
            "environment",
            "toolchains",
            "mysql-repair",
            "space-move",
            "c-drive-expand",
        ] {
            assert!(ids.contains(id));
        }
    }

    #[test]
    fn all_high_and_critical_have_confirmation() {
        for item in feature_risk_registry() {
            if item.risk_level == "high" {
                assert_eq!(item.confirmation_level, "double");
            }
            if item.risk_level == "critical" {
                assert_eq!(item.confirmation_level, "triple");
                assert!(item.requires_backup);
            }
        }
    }
}
