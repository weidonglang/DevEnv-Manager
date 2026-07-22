use super::model::{
    RecycleBinCleanupPlan, RecycleBinCleanupResult, RecycleBinItem, RecycleBinReport,
    RecycleBinVolumeSummary,
};
use super::utils::{generated_at, unique_id};
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
        return Err("Windows Recycle Bin inspection is only available on Windows.".to_string());
    }
    #[cfg(windows)]
    {
        let output = run_powershell_script(INSPECT_SCRIPT, Vec::new(), 30)?;
        if !output.success {
            return Err(format!(
                "Windows Recycle Bin inspection failed: {}",
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
        return Err(
            "Recycle Bin contents changed after preview. Refresh and create a new cleanup plan."
                .to_string(),
        );
    }

    let output = run_powershell(PowerShellRequest {
        script: CLEAR_SCRIPT.to_string(),
        args: plan.selected_drives.clone(),
        cwd: None,
        timeout_seconds: 30,
        risk_level: "critical".to_string(),
        requires_admin: false,
        allow_network: false,
        confirmation_token: Some("validated-by-tauri-command-token-gate".to_string()),
    })?;
    if !output.success {
        return Err(format!(
            "Windows Recycle Bin cleanup failed: {}",
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
            "recycle-bin-cleanup-verified".to_string()
        } else {
            "recycle-bin-cleanup-incomplete".to_string()
        },
    })
}

fn verified_cleanup_failures(
    outcomes: &[ClearOutcome],
    remaining_items: usize,
    cleaned_items: usize,
    expected_items: usize,
) -> Vec<String> {
    // Clear-RecycleBin can report ERROR_FILE_NOT_FOUND after Windows has already
    // removed the final item. The fresh shell snapshot is the authoritative result.
    if remaining_items == 0 && cleaned_items == expected_items {
        return Vec::new();
    }

    let mut failures = outcomes
        .iter()
        .filter(|item| !item.success)
        .map(|item| format!("{}: {}", item.drive, item.error))
        .collect::<Vec<_>>();
    if remaining_items > 0 {
        failures.push(format!(
            "{remaining_items} previewed item(s) remain on the selected volume(s) after cleanup."
        ));
    }
    if cleaned_items != expected_items {
        failures.push(format!(
            "Cleanup verification removed {cleaned_items} of {expected_items} previewed item(s)."
        ));
    }
    failures
}

fn parse_report(json: &str) -> Result<RecycleBinReport, String> {
    let raw: RawRecycleBinEnvelope = serde_json::from_str(json.trim())
        .map_err(|error| format!("Invalid Recycle Bin inspection response: {error}"))?;
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
                warnings.push("unresolved-source-drive".to_string());
            }
            if !item.recoverable {
                warnings.push("unrecoverable-item".to_string());
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
    let mut volume_map = BTreeMap::<String, RecycleBinVolumeSummary>::new();
    for item in &items {
        let drive = if item.source_drive.is_empty() {
            "unknown".to_string()
        } else {
            item.source_drive.clone()
        };
        let summary = volume_map
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
        volumes: volume_map.into_values().collect(),
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
        .map(|value| {
            normalize_drive(&value).ok_or_else(|| format!("Invalid Recycle Bin drive: {value}"))
        })
        .collect::<Result<BTreeSet<_>, _>>()?
        .into_iter()
        .collect::<Vec<_>>();
    if selected_drives.is_empty() {
        return Err(
            "Select at least one Recycle Bin volume before creating a cleanup plan.".to_string(),
        );
    }
    let items = selected_items(report, &selected_drives);
    if items.is_empty() {
        return Err(
            "The selected Recycle Bin volume does not contain any previewed items.".to_string(),
        );
    }
    let item_ids = items.iter().map(|item| item.id.clone()).collect::<Vec<_>>();
    let estimated_bytes = items.iter().map(|item| item.size).sum::<u64>();
    let snapshot_fingerprint = snapshot_fingerprint(&items);
    Ok(RecycleBinCleanupPlan {
        plan_id: format!(
            "{}-{}",
            unique_id("recycle-bin-cleanup"),
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
            "permanent-removal".to_string(),
            "scope-by-volume".to_string(),
            "snapshot-must-match".to_string(),
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
        return Err("Recycle Bin cleanup plan is incomplete or invalid.".to_string());
    }
    for drive in &plan.selected_drives {
        if normalize_drive(drive).as_deref() != Some(drive.as_str()) {
            return Err(format!(
                "Recycle Bin cleanup plan contains an invalid drive: {drive}"
            ));
        }
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
    let value = value.trim();
    let bytes = value.as_bytes();
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
        .map_err(|error| format!("Invalid Recycle Bin cleanup response: {error}"))?;
    if value.is_array() {
        serde_json::from_value(value)
            .map_err(|error| format!("Invalid Recycle Bin cleanup response: {error}"))
    } else {
        serde_json::from_value(value)
            .map(|item| vec![item])
            .map_err(|error| format!("Invalid Recycle Bin cleanup response: {error}"))
    }
}

fn readable_runner_error(stderr: &str, stdout: &str) -> String {
    let message = if stderr.trim().is_empty() {
        stdout
    } else {
        stderr
    };
    let message = message.trim();
    if message.is_empty() {
        "PowerShell returned no diagnostic message.".to_string()
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
    fn recycle_report_groups_items_by_source_volume() {
        let report = fixture_report();
        assert_eq!(report.item_count, 2);
        assert_eq!(report.total_bytes, 142);
        assert_eq!(report.volumes.len(), 2);
        assert_eq!(report.volumes[0].drive, "C:");
        assert_eq!(report.volumes[1].drive, "D:");
    }

    #[test]
    fn recycle_plan_snapshots_selected_volume_items_and_rejects_empty_selection() {
        let report = fixture_report();
        let plan = create_plan_from_report(&report, vec!["d:\\".to_string()]).unwrap();
        assert_eq!(plan.selected_drives, vec!["D:"]);
        assert_eq!(plan.item_count, 1);
        assert_eq!(plan.estimated_bytes, 100);
        assert_eq!(plan.risk_level, "critical");
        assert_eq!(plan.snapshot_fingerprint.len(), 64);
        assert!(create_plan_from_report(&report, Vec::new()).is_err());
    }

    #[test]
    fn recycle_plan_snapshot_changes_when_preview_changes() {
        let report = fixture_report();
        let first = create_plan_from_report(&report, vec!["C:".to_string()]).unwrap();
        let mut changed = report;
        changed.items[0].size += 1;
        let second = create_plan_from_report(&changed, vec!["C:".to_string()]).unwrap();
        assert_ne!(first.snapshot_fingerprint, second.snapshot_fingerprint);
    }

    #[test]
    fn recycle_report_recovers_source_drive_from_item_paths() {
        let report = parse_report(
            r#"{"Items":[{"Name":"fallback.txt","OriginalPath":"","RecyclePath":"E:\\$Recycle.Bin\\S-1-5-21\\$R3.txt","SourceDrive":"","Size":7,"DeletedAt":"2026-07-20T00:02:00Z","Recoverable":false}],"Warnings":[]}"#,
        )
        .unwrap();
        assert_eq!(report.items[0].source_drive, "E:");
        assert_eq!(report.volumes[0].drive, "E:");
        assert!(!report
            .warnings
            .iter()
            .any(|item| item == "unresolved-source-drive"));
    }

    #[test]
    fn recycle_cleanup_accepts_verified_empty_snapshot_after_cmdlet_file_not_found() {
        let outcomes = vec![ClearOutcome {
            drive: "E:".to_string(),
            success: false,
            error: "The system cannot find the file specified.".to_string(),
        }];
        assert!(verified_cleanup_failures(&outcomes, 0, 1, 1).is_empty());
    }

    #[test]
    fn recycle_cleanup_keeps_cmdlet_error_when_items_remain() {
        let outcomes = vec![ClearOutcome {
            drive: "E:".to_string(),
            success: false,
            error: "Access is denied.".to_string(),
        }];
        let failures = verified_cleanup_failures(&outcomes, 1, 0, 1);
        assert!(failures
            .iter()
            .any(|item| item.contains("Access is denied")));
        assert!(failures.iter().any(|item| item.contains("remain")));
        assert!(failures.iter().any(|item| item.contains("removed 0 of 1")));
    }
}
