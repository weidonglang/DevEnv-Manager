use super::plan::{consume_plan, load_plan, plan_is_expired, EnvRepairPlan};
use super::rollback::create_backup;
use super::verify::verify_env_after_apply;
use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvRepairResult {
    pub plan_id: String,
    pub success: bool,
    pub message: String,
    pub backup_name: String,
    pub verification: Option<super::verify::EnvVerificationReport>,
}

pub fn apply_env_repair_plan(managed_root: &Path, plan: EnvRepairPlan) -> EnvRepairResult {
    let stored = match load_plan(&plan.plan_id) {
        Ok(stored) => stored,
        Err(error) => return failed(&plan, format!("计划不存在、已执行或已过期：{error}")),
    };
    if serde_json::to_value(&stored).ok() != serde_json::to_value(&plan).ok() {
        return failed(
            &plan,
            "前端传回的计划与后端存储计划不一致，已拒绝执行。".to_string(),
        );
    }
    if plan_is_expired(&stored) {
        consume_plan(&stored.plan_id);
        return failed(
            &plan,
            "环境修复计划已超过 30 分钟，请重新生成。".to_string(),
        );
    }
    let current = match user_environment() {
        Ok(value) => value,
        Err(error) => return failed(&plan, error),
    };
    if fingerprint_environment(&current) != stored.baseline_fingerprint {
        return failed(
            &plan,
            "用户环境变量在计划生成后发生变化，请重新生成计划。".to_string(),
        );
    }
    let backup_name = match create_backup(
        &stored.backup_name,
        "apply-env-repair",
        Some(&stored.plan_id),
        &current,
    ) {
        Ok(name) => name,
        Err(error) => return failed(&plan, error),
    };
    let mut writes = HashMap::new();
    if let Some(value) = stored.expected_after.devenv_home.clone() {
        writes.insert("DEVENV_HOME".to_string(), Some(value));
    }
    writes.insert(
        "JAVA_HOME".to_string(),
        stored.expected_after.java_home.clone(),
    );
    if let Some(value) = stored.expected_after.path.clone() {
        writes.insert("Path".to_string(), Some(value));
    }
    if let Err(error) = set_user_environment(&writes) {
        return failed(&plan, error);
    }
    broadcast_environment_change();
    consume_plan(&stored.plan_id);
    let verification = verify_env_after_apply(managed_root, stored.plan_id.clone());
    EnvRepairResult {
        plan_id: stored.plan_id,
        success: verification.success,
        message: if verification.success {
            "环境修复已应用并通过基础验证；请重新打开终端或 IDE。".to_string()
        } else {
            "环境修复已写入，但验证仍有警告；可使用备份恢复。".to_string()
        },
        backup_name,
        verification: Some(verification),
    }
}

fn failed(plan: &EnvRepairPlan, message: String) -> EnvRepairResult {
    EnvRepairResult {
        plan_id: plan.plan_id.clone(),
        success: false,
        message,
        backup_name: plan.backup_name.clone(),
        verification: None,
    }
}
