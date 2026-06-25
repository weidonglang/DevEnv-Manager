use super::model::{PartitionInfo, PartitionLayoutReport};
use serde::Deserialize;
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct RawPartition {
    disk_number: Option<u64>,
    partition_number: Option<u64>,
    drive_letter: Option<String>,
    size: Option<u64>,
    offset: Option<u64>,
    #[serde(rename = "Type")]
    partition_type: Option<String>,
    is_boot: Option<bool>,
    is_system: Option<bool>,
    file_system: Option<String>,
    size_remaining: Option<u64>,
    bitlocker_protection: Option<String>,
}

fn normalize_drive(value: Option<String>) -> Option<String> {
    value.and_then(|drive| {
        let drive = drive.trim().trim_end_matches(':').to_ascii_uppercase();
        (!drive.is_empty()).then_some(drive)
    })
}

fn is_recovery_type(value: &str) -> bool {
    let lowered = value.to_ascii_lowercase();
    lowered.contains("recovery") || lowered.contains("恢复")
}

fn to_info(raw: &RawPartition) -> PartitionInfo {
    let partition_type = raw.partition_type.clone().unwrap_or_default();
    PartitionInfo {
        disk_index: raw.disk_number.unwrap_or(0).to_string(),
        partition_index: raw.partition_number.unwrap_or(0).to_string(),
        drive_letter: normalize_drive(raw.drive_letter.clone()),
        size: raw.size.unwrap_or(0),
        file_system: raw.file_system.clone().filter(|value| !value.is_empty()),
        partition_type: partition_type.clone(),
        is_boot: raw.is_boot.unwrap_or(false),
        is_system: raw.is_system.unwrap_or(false),
        is_recovery: is_recovery_type(&partition_type),
        is_empty: raw.size_remaining.unwrap_or(1)
            >= raw.size.unwrap_or(0).saturating_sub(16 * 1024 * 1024),
    }
}

pub(crate) fn parse_partition_layout_json(text: &str) -> Result<PartitionLayoutReport, String> {
    let mut partitions: Vec<RawPartition> = serde_json::from_str(text)
        .or_else(|_| serde_json::from_str::<RawPartition>(text).map(|one| vec![one]))
        .map_err(|err| format!("解析分区布局失败：{err}"))?;
    partitions.sort_by_key(|item| (item.disk_number.unwrap_or(0), item.offset.unwrap_or(0)));
    let c_index = partitions
        .iter()
        .position(|item| normalize_drive(item.drive_letter.clone()).as_deref() == Some("C"))
        .ok_or_else(|| "未找到 C 盘分区".to_string())?;
    let c_raw = &partitions[c_index];
    let c_disk = c_raw.disk_number.unwrap_or(0);
    let c_end = c_raw
        .offset
        .unwrap_or(0)
        .saturating_add(c_raw.size.unwrap_or(0));
    let adjacent_raw = partitions
        .iter()
        .filter(|item| item.disk_number.unwrap_or(0) == c_disk && item.offset.unwrap_or(0) >= c_end)
        .min_by_key(|item| item.offset.unwrap_or(u64::MAX));
    let unallocated_after_c = adjacent_raw
        .and_then(|next| next.offset)
        .and_then(|offset| offset.checked_sub(c_end))
        .filter(|gap| *gap > 16 * 1024 * 1024);
    let adjacent_right = adjacent_raw.map(to_info);
    let recovery_partition_blocks = adjacent_right.as_ref().is_some_and(|item| item.is_recovery);
    let d_partition_same_disk = partitions.iter().any(|item| {
        item.disk_number.unwrap_or(0) == c_disk
            && normalize_drive(item.drive_letter.clone()).as_deref() == Some("D")
    });
    let c_partition = to_info(c_raw);
    let bitlocker_suspected = c_raw
        .bitlocker_protection
        .as_deref()
        .is_some_and(|value| value != "Off" && value != "0" && !value.is_empty());
    let ntfs = c_partition
        .file_system
        .as_deref()
        .is_some_and(|fs| fs.eq_ignore_ascii_case("ntfs"));
    let can_extend_safely = unallocated_after_c.is_some() && ntfs && !bitlocker_suspected;
    let can_delete_empty_adjacent_partition = adjacent_right.as_ref().is_some_and(|item| {
        item.is_empty
            && !item.is_boot
            && !item.is_system
            && !item.is_recovery
            && item.drive_letter.is_some()
    });
    let (result_level, explanation) = if can_extend_safely {
        ("safe", "C 盘右侧存在相邻未分配空间，可生成安全扩容计划。")
    } else if recovery_partition_blocks {
        (
            "blocked",
            "C 盘右侧被恢复分区阻挡，Windows 磁盘管理通常无法直接扩展。",
        )
    } else if d_partition_same_disk {
        ("caution", "检测到 D 盘在同一物理磁盘；只有相邻且为空时才可能删除后扩展，不能直接把有数据的 D 盘借给 C 盘。")
    } else {
        (
            "info",
            "未发现 C 盘右侧可直接扩容的安全空间；建议优先使用空间搬家。",
        )
    };
    let mut suggested_actions = vec!["扩容前先备份重要数据并接入电源。".to_string()];
    if can_extend_safely {
        suggested_actions.push("可创建 safe_extend_unallocated 计划。".to_string());
    } else if can_delete_empty_adjacent_partition {
        suggested_actions.push("相邻空分区仅在三次确认后才允许删除并扩展。".to_string());
    } else {
        suggested_actions
            .push("建议使用空间搬家、桌面/下载归档或第三方分区工具人工处理。".to_string());
    }
    Ok(PartitionLayoutReport {
        system_disk: c_disk.to_string(),
        c_partition,
        adjacent_right,
        unallocated_after_c,
        recovery_partition_blocks,
        d_partition_same_disk,
        bitlocker_suspected,
        can_extend_safely,
        can_delete_empty_adjacent_partition,
        result_level: result_level.to_string(),
        explanation: explanation.to_string(),
        suggested_actions,
    })
}

pub fn inspect_partition_layout() -> Result<PartitionLayoutReport, String> {
    #[cfg(windows)]
    {
        let script = r#"
$parts = Get-Partition | ForEach-Object {
  $vol = $null
  if ($_.DriveLetter) { $vol = Get-Volume -DriveLetter $_.DriveLetter -ErrorAction SilentlyContinue }
  [pscustomobject]@{
    DiskNumber=$_.DiskNumber
    PartitionNumber=$_.PartitionNumber
    DriveLetter=[string]$_.DriveLetter
    Size=[uint64]$_.Size
    Offset=[uint64]$_.Offset
    Type=[string]$_.Type
    IsBoot=[bool]$_.IsBoot
    IsSystem=[bool]$_.IsSystem
    FileSystem=if ($vol) { [string]$vol.FileSystem } else { "" }
    SizeRemaining=if ($vol) { [uint64]$vol.SizeRemaining } else { [uint64]0 }
    BitlockerProtection=""
  }
}
$parts | ConvertTo-Json -Depth 4
"#;
        let output = Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .output()
            .map_err(|err| format!("读取分区布局失败：{err}"))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        parse_partition_layout_json(&String::from_utf8_lossy(&output.stdout))
    }
    #[cfg(not(windows))]
    {
        Err("C 盘扩容检测仅支持 Windows".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partition_parser_detects_recovery_block() {
        let report = parse_partition_layout_json(r#"[
          {"DiskNumber":0,"PartitionNumber":1,"DriveLetter":"C","Size":1000,"Offset":100,"Type":"Basic","IsBoot":true,"IsSystem":true,"FileSystem":"NTFS","SizeRemaining":100},
          {"DiskNumber":0,"PartitionNumber":2,"DriveLetter":"","Size":500,"Offset":1100,"Type":"Recovery","IsBoot":false,"IsSystem":false,"FileSystem":"","SizeRemaining":0}
        ]"#).unwrap();
        assert!(report.recovery_partition_blocks);
        assert!(!report.can_extend_safely);
    }

    #[test]
    fn partition_parser_detects_unallocated_after_c() {
        let report = parse_partition_layout_json(&format!(r#"[
          {{"DiskNumber":0,"PartitionNumber":1,"DriveLetter":"C","Size":{},"Offset":{},"Type":"Basic","IsBoot":true,"IsSystem":true,"FileSystem":"NTFS","SizeRemaining":100}},
          {{"DiskNumber":0,"PartitionNumber":2,"DriveLetter":"D","Size":{},"Offset":{},"Type":"Basic","IsBoot":false,"IsSystem":false,"FileSystem":"NTFS","SizeRemaining":{}}}
        ]"#, 100_u64 * 1024 * 1024, 1024_u64 * 1024, 50_u64 * 1024 * 1024, 200_u64 * 1024 * 1024, 50_u64 * 1024 * 1024)).unwrap();
        assert!(report.unallocated_after_c.unwrap() > 16 * 1024 * 1024);
        assert!(report.can_extend_safely);
    }
}
