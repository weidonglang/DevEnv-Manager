use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvBackupRecord {
    pub backup_name: String,
    pub created_at: String,
    pub reason: String,
    pub variables: Vec<String>,
    pub java_home_preview: Option<String>,
    pub devenv_home_preview: Option<String>,
    pub path_entry_count: usize,
    pub source_plan_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvBackupFile {
    pub record: EnvBackupRecord,
    pub values: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvBackupDiff {
    pub backup_name: String,
    pub current_java_home: Option<String>,
    pub backup_java_home: Option<String>,
    pub current_path_entries: usize,
    pub backup_path_entries: usize,
    pub changed_variables: Vec<String>,
}

fn backup_dir() -> PathBuf {
    app_config_dir().join("env_backups")
}

pub(crate) fn create_backup(
    preferred_name: &str,
    reason: &str,
    source_plan_id: Option<&str>,
    envs: &HashMap<String, String>,
) -> Result<String, String> {
    let backup_name = if preferred_name.is_empty() {
        format!("env-backup-{}.json", now_string())
    } else {
        preferred_name.to_string()
    };
    let path = backup_dir().join(&backup_name);
    let path_value = envs
        .get("Path")
        .or_else(|| envs.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let file = EnvBackupFile {
        record: EnvBackupRecord {
            backup_name: backup_name.clone(),
            created_at: now_string(),
            reason: reason.to_string(),
            variables: vec![
                "DEVENV_HOME".to_string(),
                "JAVA_HOME".to_string(),
                "Path".to_string(),
            ],
            java_home_preview: envs.get("JAVA_HOME").cloned(),
            devenv_home_preview: envs.get("DEVENV_HOME").cloned(),
            path_entry_count: split_path(&path_value).len(),
            source_plan_id: source_plan_id.map(str::to_string),
        },
        values: envs.clone(),
    };
    write_json(&path, &file)?;
    Ok(backup_name)
}

pub fn list_env_backups() -> Vec<EnvBackupRecord> {
    let Ok(entries) = fs::read_dir(backup_dir()) else {
        return Vec::new();
    };
    let mut records = Vec::new();
    for entry in entries.flatten() {
        if let Ok(file) = read_json::<EnvBackupFile>(&entry.path()) {
            records.push(file.record);
        }
    }
    records.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    records
}

pub fn inspect_env_backup(backup_name: String) -> Result<EnvBackupDiff, String> {
    let backup = read_json::<EnvBackupFile>(&backup_dir().join(&backup_name))?;
    let current = user_environment()?;
    let current_path = current
        .get("Path")
        .or_else(|| current.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let backup_path = backup
        .values
        .get("Path")
        .or_else(|| backup.values.get("PATH"))
        .cloned()
        .unwrap_or_default();
    let mut changed = Vec::new();
    for name in ["DEVENV_HOME", "JAVA_HOME", "Path"] {
        if current.get(name) != backup.values.get(name) {
            changed.push(name.to_string());
        }
    }
    Ok(EnvBackupDiff {
        backup_name,
        current_java_home: current.get("JAVA_HOME").cloned(),
        backup_java_home: backup.values.get("JAVA_HOME").cloned(),
        current_path_entries: split_path(&current_path).len(),
        backup_path_entries: split_path(&backup_path).len(),
        changed_variables: changed,
    })
}

pub fn restore_env_backup(backup_name: String) -> Result<super::apply::EnvRepairResult, String> {
    let backup = read_json::<EnvBackupFile>(&backup_dir().join(&backup_name))?;
    let current = user_environment()?;
    let pre_restore = create_backup("", "before-restore-env-backup", None, &current)?;
    let mut writes = HashMap::new();
    writes.insert(
        "DEVENV_HOME".to_string(),
        backup.values.get("DEVENV_HOME").cloned(),
    );
    writes.insert(
        "JAVA_HOME".to_string(),
        backup.values.get("JAVA_HOME").cloned(),
    );
    writes.insert(
        "Path".to_string(),
        backup
            .values
            .get("Path")
            .or_else(|| backup.values.get("PATH"))
            .cloned(),
    );
    set_user_environment(&writes)?;
    broadcast_environment_change();
    Ok(super::apply::EnvRepairResult {
        plan_id: format!("restore-{backup_name}"),
        success: true,
        message: format!(
            "已恢复环境备份；恢复前当前状态已另存为 {pre_restore}。请重新打开终端或 IDE。"
        ),
        backup_name: pre_restore,
        verification: None,
    })
}
