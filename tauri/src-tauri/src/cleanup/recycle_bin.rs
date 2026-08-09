use super::model::{
    RecycleBinCleanupPlan, RecycleBinCleanupResult, RecycleBinItem, RecycleBinReport,
    RecycleBinVolumeSummary,
};
use super::utils::generated_at;
use crate::powershell_runner::{run_powershell, run_powershell_script, PowerShellRequest};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

const INSPECT_SCRIPT: &str = r#"$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace(0xA)
if ($null -eq $folder) { throw 'Windows Recycle Bin shell namespace is unavailable.' }
$items = @()
$warnings = @()
foreach ($item in @($folder.Items())) {
  try {
    $name = [string]$item.Name
    $recyclePath = [string]$item.Path
    $deletedFrom = [string]$item.ExtendedProperty('System.Recycle.DeletedFrom')
    $dateValue = $item.ExtendedProperty('System.Recycle.DateDeleted')
    $deletedAt = if ($dateValue -is [datetime]) { $dateValue.ToUniversalTime().ToString('o') } else { [string]$dateValue }
    $originalPath = if ($deletedFrom) { Join-Path -Path $deletedFrom -ChildPath $name } else { '' }
    $sourceDrive = ''
    if ($originalPath -match '^[A-Za-z]:') { $sourceDrive = $originalPath.Substring(0, 2).ToUpperInvariant() }
    elseif ($deletedFrom -match '^[A-Za-z]:') { $sourceDrive = $deletedFrom.Substring(0, 2).ToUpperInvariant() }
    $items += [pscustomobject]@{
      Name = $name
      OriginalPath = $originalPath
      RecyclePath = $recyclePath
      SourceDrive = $sourceDrive
      Size = [long]([math]::Max(0, [long]$item.Size))
      DeletedAt = $deletedAt
      Recoverable = [bool]($originalPath -and $recyclePath)
    }
  } catch {
    $warnings += [string]$_.Exception.Message
  }
}
[pscustomobject]@{ Items = @($items); Warnings = @($warnings) } | ConvertTo-Json -Compress -Depth 5"#;

const CLEAR_SCRIPT: &str = r#"param([Parameter(ValueFromRemainingArguments=$true)][string[]]$DriveLetters)
$results = @()
foreach ($drive in @($DriveLetters)) {
  $letter = ([string]$drive).Trim().TrimEnd(':').ToUpperInvariant()
  try {
    Clear-RecycleBin -DriveLetter $letter -Force -Confirm:$false -ErrorAction Stop
    $results += [pscustomobject]@{ Drive = "$letter`:"; Success = $true; Error = '' }
  } catch {
    $results += [pscustomobject]@{ Drive = "$letter`:"; Success = $false; Error = [string]$_.Exception.Message }
  }
}
@($results) | ConvertTo-Json -Compress -Depth 3"#;

#[derive(Debug, Deserialize)]
struct RawRecycleBinEnvelope {
    #[serde(rename = "Items", default)]
    items: Vec<RawRecycleBinItem>,
    #[serde(rename = "Warnings", default)]
    warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RawRecycleBinItem {
    #[serde(rename = "Name", default)]
    name: String,
    #[serde(rename = "OriginalPath", default)]
    original_path: String,
    #[serde(rename = "RecyclePath", default)]
    recycle_path: String,
    #[serde(rename = "SourceDrive", default)]
    source_drive: String,
    #[serde(rename = "Size", default)]
    size: u64,
    #[serde(rename = "DeletedAt", default)]
    deleted_at: String,
    #[serde(rename = "Recoverable", default)]
    recoverable: bool,
}

#[derive(Debug, Deserialize)]
struct ClearOutcome {
    #[serde(rename = "Drive", default)]
    drive: String,
    #[serde(rename = "Success", default)]
    success: bool,
    #[serde(rename = "Error", default)]
    error: String,
}

pub fn inspect_recycle_bin() -> Result<RecycleBinReport, String> {
    #[cfg(not(windows))]
    {
        Err("回收站检查仅支持 Windows".to_string())
    }
    #[cfg(windows)]
    {
        let output = run_powershell_script(INSPECT_SCRIPT, Vec::new(), 30)?;
        if !output.success {
            return Err(format!(
                "检查 Windows 回收站失败：{}",
                readable_runner_error(&output.stderr, &output.stdout)
            ));
        }
        parse_report(&output.stdout)
    }
}

pub fn create_recycle_bin_cleanup_plan(
    selected_drives: Vec<String>,
) -> Result<RecycleBinCleanupPlan, String> {
    let report = inspect_recycle_bin()?;
    create_plan_from_report(&report, selected_drives)
}

pub fn execute_recycle_bin_cleanup_plan(
    plan: RecycleBinCleanupPlan,
) -> Result<RecycleBinCleanupResult, String> {
    validate_plan_shape(&plan)?;
    let before = inspect_recycle_bin()?;
    let selected_before = selected_items(&before, &plan.selected_drives);
    let current_ids = selected_before
        .iter()
        .map(|item| item.id.clone())
        .collect::<Vec<_>>();
    if current_ids != plan.item_ids
        || snapshot_fingerprint(&selected_before) != plan.snapshot_fingerprint
    {
        return Err("预览后回收站内容已变化，请重新检查并创建计划".to_string());
    }

    let output = run_powershell(PowerShellRequest {
        script: CLEAR_SCRIPT.to_string(),
        args: plan.selected_drives.clone(),
        cwd: None,
        timeout_seconds: 30,
        risk_level: "critical".to_string(),
        requires_admin: false,
        allow_network: false,
        confirmation_token: Some(format!("validated-plan:{}", plan.plan_id)),
    })?;
    if !output.success {
        return Err(format!(
            "清空 Windows 回收站失败：{}",
            readable_runner_error(&output.stderr, &output.stdout)
        ));
    }
    let outcomes = parse_clear_outcomes(&output.stdout)?;
    let after = inspect_recycle_bin()?;
    let selected_after = selected_items(&after, &plan.selected_drives);
    let remaining_ids = selected_after
        .iter()
        .map(|item| item.id.as_str())
        .collect::<BTreeSet<_>>();
    let cleaned_items = plan
        .item_ids
        .iter()
        .filter(|id| !remaining_ids.contains(id.as_str()))
        .count();
    let after_bytes = selected_after.iter().map(|item| item.size).sum::<u64>();
    let failures = verified_cleanup_failures(
        &outcomes,
        selected_after.len(),
        cleaned_items,
        plan.item_count,
    );
    let success = failures.is_empty() && cleaned_items == plan.item_count;
    Ok(RecycleBinCleanupResult {
        plan_id: plan.plan_id,
        success,
        before_item_count: plan.item_count,
        before_bytes: plan.estimated_bytes,
        after_item_count: selected_after.len(),
        after_bytes,
        cleaned_items,
        cleaned_bytes: plan.estimated_bytes.saturating_sub(after_bytes),
        selected_drives: plan.selected_drives,
        failures,
        message: if success {
            "回收站已清空并通过复扫验证".to_string()
        } else {
            "回收站清理未完全完成，请查看失败项".to_string()
        },
    })
}

fn parse_report(json: &str) -> Result<RecycleBinReport, String> {
    let raw: RawRecycleBinEnvelope = serde_json::from_str(json.trim())
        .map_err(|error| format!("回收站检查结果格式无效：{error}"))?;
    Ok(report_from_raw(raw))
}

fn report_from_raw(raw: RawRecycleBinEnvelope) -> RecycleBinReport {
    let mut warnings = raw.warnings;
    let mut items = raw
        .items
        .into_iter()
        .map(|item| {
            let source_drive = normalize_drive(&item.source_drive)
                .or_else(|| drive_from_path(&item.original_path))
                .or_else(|| drive_from_path(&item.recycle_path))
                .unwrap_or_default();
            if source_drive.is_empty() {
                warnings.push("有回收站项目无法识别来源盘符，已排除执行范围".to_string());
            }
            let id = recycle_item_id(
                &item.recycle_path,
                &item.original_path,
                item.size,
                &item.deleted_at,
            );
            RecycleBinItem {
                id,
                name: item.name,
                original_path: item.original_path,
                recycle_path: item.recycle_path,
                source_drive,
                size: item.size,
                deleted_at: item.deleted_at,
                recoverable: item.recoverable,
            }
        })
        .collect::<Vec<_>>();
    items.sort_by(|left, right| {
        left.source_drive
            .cmp(&right.source_drive)
            .then(left.id.cmp(&right.id))
    });
    warnings.sort();
    warnings.dedup();
    let mut volumes = BTreeMap::<String, RecycleBinVolumeSummary>::new();
    for item in &items {
        let drive = if item.source_drive.is_empty() {
            "未知".to_string()
        } else {
            item.source_drive.clone()
        };
        let summary = volumes
            .entry(drive.clone())
            .or_insert(RecycleBinVolumeSummary {
                drive,
                ..RecycleBinVolumeSummary::default()
            });
        summary.item_count += 1;
        summary.total_bytes = summary.total_bytes.saturating_add(item.size);
        if item.recoverable {
            summary.recoverable_count += 1;
        }
    }
    RecycleBinReport {
        generated_at: generated_at(),
        item_count: items.len(),
        total_bytes: items.iter().map(|item| item.size).sum(),
        recoverable_count: items.iter().filter(|item| item.recoverable).count(),
        volumes: volumes.into_values().collect(),
        items,
        warnings,
    }
}

fn create_plan_from_report(
    report: &RecycleBinReport,
    selected_drives: Vec<String>,
) -> Result<RecycleBinCleanupPlan, String> {
    let selected_drives = selected_drives
        .into_iter()
        .map(|value| normalize_drive(&value).ok_or_else(|| format!("无效盘符：{value}")))
        .collect::<Result<BTreeSet<_>, _>>()?
        .into_iter()
        .collect::<Vec<_>>();
    if selected_drives.is_empty() {
        return Err("请至少选择一个有内容的回收站盘符".to_string());
    }
    let items = selected_items(report, &selected_drives);
    if items.is_empty() {
        return Err("所选盘符的回收站中没有可预览项目".to_string());
    }
    let item_ids = items.iter().map(|item| item.id.clone()).collect::<Vec<_>>();
    let estimated_bytes = items.iter().map(|item| item.size).sum::<u64>();
    let snapshot_fingerprint = snapshot_fingerprint(&items);
    Ok(RecycleBinCleanupPlan {
        plan_id: format!(
            "recycle-bin-{}-{}",
            generated_at(),
            &snapshot_fingerprint[..12]
        ),
        created_at: generated_at(),
        selected_drives,
        item_ids,
        item_count: items.len(),
        estimated_bytes,
        snapshot_fingerprint,
        risk_level: "critical".to_string(),
        warnings: vec![
            "执行后文件将永久移除，不能从回收站恢复".to_string(),
            "执行前后都会重新读取回收站，内容变化时拒绝执行".to_string(),
        ],
    })
}

fn validate_plan_shape(plan: &RecycleBinCleanupPlan) -> Result<(), String> {
    if plan.plan_id.trim().is_empty()
        || plan.risk_level != "critical"
        || plan.selected_drives.is_empty()
        || plan.item_ids.is_empty()
        || plan.item_count != plan.item_ids.len()
    {
        return Err("回收站清理计划不完整或已损坏".to_string());
    }
    if plan
        .selected_drives
        .iter()
        .any(|drive| normalize_drive(drive).as_deref() != Some(drive.as_str()))
    {
        return Err("回收站清理计划包含无效盘符".to_string());
    }
    Ok(())
}

fn selected_items<'a>(report: &'a RecycleBinReport, drives: &[String]) -> Vec<&'a RecycleBinItem> {
    let drives = drives.iter().map(String::as_str).collect::<BTreeSet<_>>();
    report
        .items
        .iter()
        .filter(|item| drives.contains(item.source_drive.as_str()))
        .collect()
}

fn snapshot_fingerprint(items: &[&RecycleBinItem]) -> String {
    let mut rows = items
        .iter()
        .map(|item| {
            format!(
                "{}\0{}\0{}\0{}",
                item.id, item.source_drive, item.size, item.recycle_path
            )
        })
        .collect::<Vec<_>>();
    rows.sort();
    let mut hasher = Sha256::new();
    for row in rows {
        hasher.update(row.as_bytes());
        hasher.update(b"\n");
    }
    format!("{:x}", hasher.finalize())
}

fn recycle_item_id(recycle_path: &str, original_path: &str, size: u64, deleted_at: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(recycle_path.to_ascii_lowercase().as_bytes());
    hasher.update(b"\0");
    hasher.update(original_path.to_ascii_lowercase().as_bytes());
    hasher.update(b"\0");
    hasher.update(size.to_le_bytes());
    hasher.update(deleted_at.as_bytes());
    format!("recycle-item-{:x}", hasher.finalize())
}

fn normalize_drive(value: &str) -> Option<String> {
    let value = value.trim();
    let bytes = value.as_bytes();
    if bytes.len() < 2 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' {
        return None;
    }
    if bytes.len() > 3 || (bytes.len() == 3 && !matches!(bytes[2], b'\\' | b'/')) {
        return None;
    }
    Some(format!("{}:", (bytes[0] as char).to_ascii_uppercase()))
}

fn drive_from_path(value: &str) -> Option<String> {
    let bytes = value.trim().as_bytes();
    if bytes.len() < 3
        || !bytes[0].is_ascii_alphabetic()
        || bytes[1] != b':'
        || !matches!(bytes[2], b'\\' | b'/')
    {
        return None;
    }
    Some(format!("{}:", (bytes[0] as char).to_ascii_uppercase()))
}

fn parse_clear_outcomes(json: &str) -> Result<Vec<ClearOutcome>, String> {
    let value = serde_json::from_str::<serde_json::Value>(json.trim())
        .map_err(|error| format!("回收站清理结果格式无效：{error}"))?;
    if value.is_array() {
        serde_json::from_value(value).map_err(|error| format!("回收站清理结果格式无效：{error}"))
    } else {
        serde_json::from_value(value)
            .map(|item| vec![item])
            .map_err(|error| format!("回收站清理结果格式无效：{error}"))
    }
}

fn verified_cleanup_failures(
    outcomes: &[ClearOutcome],
    remaining_items: usize,
    cleaned_items: usize,
    expected_items: usize,
) -> Vec<String> {
    if remaining_items == 0 && cleaned_items == expected_items {
        return Vec::new();
    }
    let mut failures = outcomes
        .iter()
        .filter(|item| !item.success)
        .map(|item| format!("{}：{}", item.drive, item.error))
        .collect::<Vec<_>>();
    if remaining_items > 0 {
        failures.push(format!("复扫后仍有 {remaining_items} 个所选项目存在"));
    }
    if cleaned_items != expected_items {
        failures.push(format!(
            "复扫确认移除了 {cleaned_items}/{expected_items} 个预览项目"
        ));
    }
    failures
}

fn readable_runner_error(stderr: &str, stdout: &str) -> String {
    let message = if stderr.trim().is_empty() {
        stdout.trim()
    } else {
        stderr.trim()
    };
    if message.is_empty() {
        "PowerShell 没有返回诊断信息".to_string()
    } else {
        message.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_report() -> RecycleBinReport {
        parse_report(
            r#"{"Items":[{"Name":"one.txt","OriginalPath":"C:\\Users\\Fixture\\Desktop\\one.txt","RecyclePath":"C:\\$Recycle.Bin\\S-1-5-21\\$R1.txt","SourceDrive":"C:","Size":42,"DeletedAt":"2026-07-20T00:00:00Z","Recoverable":true},{"Name":"two.zip","OriginalPath":"D:\\Downloads\\two.zip","RecyclePath":"D:\\$Recycle.Bin\\S-1-5-21\\$R2.zip","SourceDrive":"D:","Size":100,"DeletedAt":"2026-07-20T00:01:00Z","Recoverable":true}],"Warnings":[]}"#,
        )
        .unwrap()
    }

    #[test]
    fn report_groups_items_by_source_volume() {
        let report = fixture_report();
        assert_eq!(report.item_count, 2);
        assert_eq!(report.total_bytes, 142);
        assert_eq!(report.volumes.len(), 2);
    }

    #[test]
    fn plan_snapshots_only_selected_volumes() {
        let report = fixture_report();
        let plan = create_plan_from_report(&report, vec!["d:\\".to_string()]).unwrap();
        assert_eq!(plan.selected_drives, vec!["D:"]);
        assert_eq!(plan.item_count, 1);
        assert_eq!(plan.estimated_bytes, 100);
        assert_eq!(plan.snapshot_fingerprint.len(), 64);
        assert!(create_plan_from_report(&report, Vec::new()).is_err());
    }

    #[test]
    fn snapshot_changes_when_preview_changes() {
        let report = fixture_report();
        let first = create_plan_from_report(&report, vec!["C:".to_string()]).unwrap();
        let mut changed = report;
        changed.items[0].size += 1;
        let second = create_plan_from_report(&changed, vec!["C:".to_string()]).unwrap();
        assert_ne!(first.snapshot_fingerprint, second.snapshot_fingerprint);
    }

    #[test]
    fn verified_empty_snapshot_overrides_cmdlet_file_not_found() {
        let outcomes = vec![ClearOutcome {
            drive: "E:".to_string(),
            success: false,
            error: "The system cannot find the file specified.".to_string(),
        }];
        assert!(verified_cleanup_failures(&outcomes, 0, 1, 1).is_empty());
    }
}
