use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupArchitecture {
    pub schema_version: u32,
    pub status: &'static str,
    pub categories: Vec<CleanupCategory>,
    pub safety_rules: Vec<&'static str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCategory {
    pub id: &'static str,
    pub name: &'static str,
    pub risk: &'static str,
    pub scan_only: bool,
    pub cleanup_enabled: bool,
    pub protected_patterns: Vec<&'static str>,
}

pub fn architecture() -> CleanupArchitecture {
    CleanupArchitecture {
        schema_version: 1,
        status: "architecture-only",
        categories: vec![
            CleanupCategory {
                id: "windows-temp",
                name: "Windows 与用户临时文件",
                risk: "medium",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["正在使用的文件", "安装器事务目录", "系统还原与更新缓存"],
            },
            CleanupCategory {
                id: "developer-caches",
                name: "开发工具缓存",
                risk: "medium",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["当前项目依赖目录", "受管运行时目录", "离线安装包白名单"],
            },
            CleanupCategory {
                id: "browser-caches",
                name: "浏览器缓存",
                risk: "high",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["Cookie", "登录状态", "密码数据库", "浏览器配置"],
            },
            CleanupCategory {
                id: "logs-and-dumps",
                name: "日志与崩溃转储",
                risk: "low",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["最近诊断报告", "用户指定保留文件", "正在写入的日志"],
            },
            CleanupCategory {
                id: "recycle-bin",
                name: "回收站",
                risk: "high",
                scan_only: true,
                cleanup_enabled: false,
                protected_patterns: vec!["默认不自动清空", "必须逐次确认"],
            },
        ],
        safety_rules: vec![
            "默认只扫描，不删除",
            "扫描结果必须展示完整路径、大小、来源和风险",
            "系统目录、用户文档、项目目录和受管运行时默认排除",
            "执行前创建清单并要求用户逐类确认",
            "优先调用工具自身清理命令，不直接删除未知目录",
            "不提供静默清理、计划任务或后台自动删除",
        ],
    }
}
