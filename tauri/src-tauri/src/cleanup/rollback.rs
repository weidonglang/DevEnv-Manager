use super::migration::sha256_file;
use super::model::{MoveReceipt, RollbackRecord};
use super::utils::generated_at;
use std::fs;
use std::path::Path;

fn restore_archived_file(receipt: &MoveReceipt) -> Result<(), String> {
    let source = Path::new(&receipt.source);
    let target = Path::new(&receipt.target);
    if source.exists() && !target.exists() {
        return match sha256_file(source) {
            Ok(hash) if hash.eq_ignore_ascii_case(&receipt.source_sha256) => Ok(()),
            _ => Err(format!(
                "原位置文件已存在但哈希不一致：{}",
                source.display()
            )),
        };
    }
    if source.exists() {
        return Err(format!(
            "原位置和归档位置同时存在，拒绝覆盖：{}",
            source.display()
        ));
    }
    if !target.exists()
        || !sha256_file(target).is_ok_and(|hash| hash.eq_ignore_ascii_case(&receipt.target_sha256))
    {
        return Err(format!("归档文件缺失或哈希已变化：{}", target.display()));
    }
    if let Some(parent) = source.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("创建原目录失败 {}：{error}", parent.display()))?;
    }
    let copied = fs::copy(target, source)
        .map_err(|error| format!("复制回原位置失败 {}：{error}", source.display()))?;
    let restored = copied == receipt.size
        && sha256_file(source).is_ok_and(|hash| hash.eq_ignore_ascii_case(&receipt.source_sha256));
    if !restored {
        let _ = fs::remove_file(source);
        return Err(format!("恢复后的文件校验失败：{}", source.display()));
    }
    fs::remove_file(target)
        .map_err(|error| format!("恢复后无法移除归档副本 {}：{error}", target.display()))
}

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

    if !record.moved_files.is_empty() {
        let mut failures = Vec::new();
        for receipt in record.moved_files.iter().rev() {
            if let Err(error) = restore_archived_file(receipt) {
                failures.push(error);
            }
        }
        if !failures.is_empty() {
            return Err(format!("归档回滚未完全成功：{}", failures.join("；")));
        }
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
            moved_files: Vec::new(),
            notes: vec!["ok".to_string()],
        };
        save_rollback_record(root.path(), record).unwrap();
        assert_eq!(list_rollback_records(root.path()).len(), 1);
    }

    #[test]
    fn downloads_archive_receipt_is_restored() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("Downloads").join("archive.zip");
        let target = root.path().join("Archive").join("archive.zip");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&target, b"archive").unwrap();
        let hash = sha256_file(&target).unwrap();
        save_rollback_record(
            root.path(),
            RollbackRecord {
                rollback_id: "downloads-r1".to_string(),
                created_at: "1".to_string(),
                operation_type: "archive_only".to_string(),
                source: source.parent().unwrap().to_string_lossy().to_string(),
                target: target.parent().unwrap().to_string_lossy().to_string(),
                backup_path: None,
                junction_path: None,
                reversible: true,
                moved_files: vec![MoveReceipt {
                    source: source.to_string_lossy().to_string(),
                    target: target.to_string_lossy().to_string(),
                    size: 7,
                    source_sha256: hash.clone(),
                    target_sha256: hash,
                }],
                notes: Vec::new(),
            },
        )
        .unwrap();

        rollback_move(root.path(), "downloads-r1".to_string()).unwrap();
        assert_eq!(fs::read(&source).unwrap(), b"archive");
        assert!(!target.exists());
    }
}
