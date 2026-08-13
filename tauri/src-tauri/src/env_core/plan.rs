use super::diff::diff_text;
use super::java::proposed_path_with_jdk;
use super::path_rules::{merge_path_with_policy, PathRepairPolicy};
use super::snapshot::{EnvReliabilitySnapshot, ExpectedEnvState};
use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvRepairOptions {
    pub target_java_home: Option<String>,
    pub repair_path: bool,
    pub remove_stale_devenv_entries: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvRepairPlan {
    pub plan_id: String,
    pub created_at: String,
    pub target: String,
    pub actions: Vec<EnvRepairAction>,
    pub before_snapshot: EnvReliabilitySnapshot,
    pub expected_after: ExpectedEnvState,
    pub warnings: Vec<String>,
    pub risk_level: String,
    pub requires_terminal_restart: bool,
    pub backup_name: String,
    pub disclaimer: String,
    pub diff: Vec<String>,
    pub baseline_fingerprint: String,
}

pub(crate) fn plan_dir() -> PathBuf {
    app_config_dir().join("env_plans")
}

pub fn create_env_repair_plan(
    managed_root: &Path,
    target: String,
    options: EnvRepairOptions,
) -> Result<EnvRepairPlan, String> {
    let user = user_environment()?;
    let snapshot = super::snapshot::inspect_env_reliability(managed_root);
    let old_java = user.get("JAVA_HOME").cloned();
    let old_devenv = user.get("DEVENV_HOME").cloned();
    let old_path = user
        .get("Path")
        .or_else(|| user.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let mut actions = Vec::new();
    let mut expected = ExpectedEnvState {
        java_home: old_java.clone(),
        devenv_home: Some(display_path(managed_root)),
        path: Some(old_path.clone()),
    };
    let mut warnings = vec![
        "本计划只修改当前用户级环境变量，不修改系统级环境变量。".to_string(),
        "修改后已打开的终端、IDE、服务进程可能仍保留旧环境。".to_string(),
    ];

    if old_devenv.as_deref().map(path_key) != Some(path_key(&display_path(managed_root))) {
        actions.push(EnvRepairAction {
            id: "set-devenv-home".to_string(),
            title: "写入用户级 DEVENV_HOME".to_string(),
            description: "指向当前 DevEnv Manager 根目录。".to_string(),
            variable: "DEVENV_HOME".to_string(),
            old_value: old_devenv,
            new_value: Some(display_path(managed_root)),
            risk: "medium".to_string(),
            reversible: true,
        });
    }
    if let Some(java_home) = options.target_java_home {
        let path = PathBuf::from(&java_home);
        if java_home.contains('%') {
            return Err("JAVA_HOME 不允许写入间接引用".to_string());
        }
        if !is_java_home_root(&path) {
            return Err(
                "JAVA_HOME 必须是包含 bin\\java.exe 和 bin\\javac.exe 的 JDK 根目录".to_string(),
            );
        }
        expected.java_home = Some(java_home.clone());
        actions.push(EnvRepairAction {
            id: "set-java-home".to_string(),
            title: "写入绝对 JAVA_HOME".to_string(),
            description: "JAVA_HOME 将写入真实绝对路径，不写入 %DEVENV_HOME% 等间接引用。"
                .to_string(),
            variable: "JAVA_HOME".to_string(),
            old_value: old_java.clone(),
            new_value: Some(java_home),
            risk: "medium".to_string(),
            reversible: true,
        });
    }
    if options.repair_path {
        let policy = PathRepairPolicy {
            remove_stale_devenv_entries: options.remove_stale_devenv_entries,
            ..PathRepairPolicy::default()
        };
        let proposed = if target == "java" {
            proposed_path_with_jdk(managed_root, &user)
        } else {
            merge_path_with_policy(&old_path, managed_root, &user, &policy)
        };
        expected.path = Some(proposed.clone());
        if proposed != old_path {
            actions.push(EnvRepairAction {
                id: "repair-path".to_string(),
                title: "修复用户级 PATH".to_string(),
                description:
                    "保留未知用户 PATH；去重、移除旧 DevEnv 受管残留，并把当前受管条目前置。"
                        .to_string(),
                variable: "Path".to_string(),
                old_value: Some(old_path.clone()),
                new_value: Some(proposed),
                risk: "medium".to_string(),
                reversible: true,
            });
        }
    }
    if actions.is_empty() {
        warnings.push("当前没有可应用的环境修复动作。".to_string());
    }
    let plan_id = format!("env-plan-{}", now_string());
    let backup_name = format!("env-repair-backup-{}.json", now_string());
    let diff = diff_text(
        old_java.as_deref(),
        expected.java_home.as_deref(),
        Some(&old_path),
        expected.path.as_deref(),
    );
    let plan = EnvRepairPlan {
        plan_id: plan_id.clone(),
        created_at: now_string(),
        target,
        actions,
        before_snapshot: snapshot,
        expected_after: expected,
        warnings,
        risk_level: "medium".to_string(),
        requires_terminal_restart: true,
        backup_name,
        disclaimer: "环境变量修改后，新终端通常会读取最新用户环境；已经打开的 IDE、服务、Nacos、Maven/Gradle Daemon 可能需要重启。".to_string(),
        diff,
        baseline_fingerprint: fingerprint_environment(&user),
    };
    store_plan(&plan)?;
    Ok(plan)
}

pub(crate) fn store_plan(plan: &EnvRepairPlan) -> Result<(), String> {
    write_json(&plan_dir().join(format!("{}.json", plan.plan_id)), plan)
}

pub(crate) fn load_plan(plan_id: &str) -> Result<EnvRepairPlan, String> {
    read_json(&plan_dir().join(format!("{plan_id}.json")))
}

pub(crate) fn consume_plan(plan_id: &str) {
    let _ = fs::remove_file(plan_dir().join(format!("{plan_id}.json")));
}

pub(crate) fn plan_is_expired(plan: &EnvRepairPlan) -> bool {
    plan.created_at
        .parse::<u64>()
        .ok()
        .is_some_and(|created| created.saturating_add(30 * 60) < now_string().parse().unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plan_expiration_uses_30_minutes() {
        let mut plan = EnvRepairPlan {
            created_at: "1".to_string(),
            ..create_dummy_plan()
        };
        assert!(plan_is_expired(&plan));
        plan.created_at = now_string();
        assert!(!plan_is_expired(&plan));
    }

    fn create_dummy_plan() -> EnvRepairPlan {
        EnvRepairPlan {
            plan_id: "test".to_string(),
            target: "path".to_string(),
            actions: Vec::new(),
            before_snapshot: EnvReliabilitySnapshot::default(),
            expected_after: ExpectedEnvState::default(),
            warnings: Vec::new(),
            risk_level: "medium".to_string(),
            requires_terminal_restart: true,
            backup_name: "backup.json".to_string(),
            disclaimer: String::new(),
            diff: Vec::new(),
            baseline_fingerprint: String::new(),
            created_at: now_string(),
        }
    }
}
