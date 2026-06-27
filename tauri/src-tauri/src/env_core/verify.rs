use super::java::verify_java_toolchain;
use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvVerificationReport {
    pub plan_id: String,
    pub success: bool,
    pub java_ok: bool,
    pub python_ok: bool,
    pub node_ok: bool,
    pub warnings: Vec<String>,
}

pub fn verify_env_after_apply(managed_root: &Path, plan_id: String) -> EnvVerificationReport {
    let user = user_environment().unwrap_or_default();
    let java = verify_java_toolchain(managed_root);
    let path = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let python_ok = find_in_path("python", &path, &user, managed_root).is_some();
    let node_ok = find_in_path("node", &path, &user, managed_root).is_some();
    let mut warnings = java.warnings.clone();
    if !python_ok {
        warnings.push("未在用户 PATH 中找到 python；如果未安装 Python 可忽略。".to_string());
    }
    if !node_ok {
        warnings.push("未在用户 PATH 中找到 node；如果未安装 Node.js 可忽略。".to_string());
    }
    EnvVerificationReport {
        plan_id,
        success: java.success,
        java_ok: java.success,
        python_ok,
        node_ok,
        warnings,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NacosEnvReport {
    pub nacos_root: String,
    pub startup_exists: bool,
    pub java_home_raw: Option<String>,
    pub java_home_expanded: Option<String>,
    pub java_exists: bool,
    pub javac_exists: bool,
    pub java_path_seen_by_nacos: Option<String>,
    pub indirect_java_home_risk: bool,
    pub process_user_env_differs: bool,
    pub explanation: Vec<String>,
}

pub fn verify_nacos_java_environment(managed_root: &Path, nacos_root: String) -> NacosEnvReport {
    let user = user_environment().unwrap_or_default();
    let process = process_environment();
    let raw = user.get("JAVA_HOME").cloned();
    let expanded = raw
        .as_deref()
        .map(|value| expand_env_value(value, &user, managed_root));
    let java = expanded
        .as_deref()
        .map(|home| PathBuf::from(home).join("bin/java.exe"));
    let javac = expanded
        .as_deref()
        .map(|home| PathBuf::from(home).join("bin/javac.exe"));
    let mut explanation = vec![
        "Nacos 启动失败不一定是 JDK 没装，可能是 JAVA_HOME 写法或环境变量生效范围有问题。"
            .to_string(),
        "本报告模拟 Nacos 子进程会看到的用户级 JAVA_HOME。".to_string(),
    ];
    if raw.as_deref().is_some_and(|value| value.contains('%')) {
        explanation.push(
            "JAVA_HOME 是间接引用，部分批处理不会二次展开。建议写入真实绝对路径。".to_string(),
        );
    }
    if process.get("JAVA_HOME") != user.get("JAVA_HOME") {
        explanation.push(
            "当前 DevEnv Manager 进程环境与用户环境不同；请重启终端、IDE 或服务。".to_string(),
        );
    }
    NacosEnvReport {
        startup_exists: Path::new(&nacos_root)
            .join("bin")
            .join("startup.cmd")
            .is_file(),
        nacos_root,
        java_home_raw: raw.clone(),
        java_home_expanded: expanded,
        java_exists: java.as_deref().is_some_and(Path::is_file),
        javac_exists: javac.as_deref().is_some_and(Path::is_file),
        java_path_seen_by_nacos: java.map(display_path),
        indirect_java_home_risk: raw.as_deref().is_some_and(|value| value.contains('%')),
        process_user_env_differs: process.get("JAVA_HOME") != user.get("JAVA_HOME"),
        explanation,
    }
}
