use super::model::RollbackRecord;
use super::utils::generated_at;
use std::fs;
use std::path::Path;

fn rollback_file(managed_root: &Path) -> std::path::PathBuf {
    managed_root.join("config").join("rollback-records.json")
}

pub(crate) fn save_rollback_record(
    managed_root: &Path,
    record: RollbackRecord,
) -> Result<(), String> {
    let path = rollback_file(managed_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建回滚目录失败：{err}"))?;
    }
    let mut records = list_rollback_records(managed_root);
    records.retain(|item| item.rollback_id != record.rollback_id);
    records.push(record);
    records.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    let data =
        serde_json::to_vec_pretty(&records).map_err(|err| format!("序列化回滚记录失败：{err}"))?;
    fs::write(path, data).map_err(|err| format!("写入回滚记录失败：{err}"))
}

pub fn list_rollback_records(managed_root: &Path) -> Vec<RollbackRecord> {
    let path = rollback_file(managed_root);
    let Ok(data) = fs::read(path) else {
        return Vec::new();
    };
    serde_json::from_slice(&data).unwrap_or_default()
}

pub fn rollback_move(managed_root: &Path, rollback_id: String) -> Result<String, String> {
    let mut records = list_rollback_records(managed_root);
    let Some(record) = records
        .iter()
        .find(|item| item.rollback_id == rollback_id)
        .cloned()
    else {
        return Err("未找到回滚记录".to_string());
    };
    if !record.reversible {
        return Err("该操作被标记为不可自动回滚，请根据报告手动处理".to_string());
    }

    if let Some(junction) = record.junction_path.as_deref() {
        let junction_path = Path::new(junction);
        if junction_path.exists() {
            fs::remove_dir(junction_path).map_err(|err| format!("移除 Junction 失败：{err}"))?;
        }
    }
    if let Some(backup) = record.backup_path.as_deref() {
        let source = Path::new(&record.source);
        let backup_path = Path::new(backup);
        if backup_path.exists() && !source.exists() {
            fs::rename(backup_path, source).map_err(|err| format!("恢复源目录失败：{err}"))?;
        }
    }

    records.retain(|item| item.rollback_id != rollback_id);
    let path = rollback_file(managed_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建回滚目录失败：{err}"))?;
    }
    let data =
        serde_json::to_vec_pretty(&records).map_err(|err| format!("序列化回滚记录失败：{err}"))?;
    fs::write(path, data).map_err(|err| format!("更新回滚记录失败：{err}"))?;
    Ok(format!(
        "已回滚 {}；时间戳 {}",
        record.operation_type,
        generated_at()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rollback_record_round_trips() {
        let root = tempfile::tempdir().unwrap();
        let record = RollbackRecord {
            rollback_id: "r1".to_string(),
            created_at: "1".to_string(),
            operation_type: "test".to_string(),
            source: "C:\\Users\\me\\Downloads".to_string(),
            target: "D:\\Archive".to_string(),
            backup_path: None,
            junction_path: None,
            reversible: true,
            notes: vec!["ok".to_string()],
        };
        save_rollback_record(root.path(), record).unwrap();
        assert_eq!(list_rollback_records(root.path()).len(), 1);
    }
}
