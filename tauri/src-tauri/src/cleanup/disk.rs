use super::model::DiskVolumeInfo;
use std::env;
use sysinfo::Disks;

const MIN_ARCHIVE_FREE_BYTES: u64 = 512 * 1024 * 1024;

pub fn risk_for_space(total_bytes: u64, free_bytes: u64) -> String {
    if total_bytes == 0 {
        return "unknown".to_string();
    }
    let free_percent = free_bytes as f64 / total_bytes as f64 * 100.0;
    if free_bytes < 5 * 1024 * 1024 * 1024 || free_percent < 5.0 {
        "critical"
    } else if free_bytes < 15 * 1024 * 1024 * 1024 || free_percent < 10.0 {
        "high"
    } else if free_bytes < 30 * 1024 * 1024 * 1024 || free_percent < 20.0 {
        "medium"
    } else {
        "low"
    }
    .to_string()
}

pub fn inspect_disk_overview() -> Result<Vec<DiskVolumeInfo>, String> {
    let disks = Disks::new_with_refreshed_list();
    let system_drive = env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
    let mut volumes = disks
        .list()
        .iter()
        .filter_map(|disk| {
            let mount = disk.mount_point().to_string_lossy().to_string();
            let total = disk.total_space();
            if mount.is_empty() || total == 0 {
                return None;
            }
            let free = disk.available_space().min(total);
            let used = total.saturating_sub(free);
            let removable = disk.is_removable();
            let read_only = disk.is_read_only();
            let system_volume = same_drive_root(&mount, &system_drive);
            let (archive_target_eligible, archive_target_reason) =
                archive_target_assessment(&mount, free, removable, read_only, system_volume);
            Some(DiskVolumeInfo {
                drive: mount,
                total_bytes: total,
                free_bytes: free,
                used_bytes: used,
                used_percent: used as f64 / total as f64 * 100.0,
                file_system: disk.file_system().to_str().map(str::to_string),
                disk_kind: format!("{:?}", disk.kind()).to_ascii_lowercase(),
                removable,
                read_only,
                system_volume,
                archive_target_eligible,
                archive_target_reason,
                risk: risk_for_space(total, free),
            })
        })
        .collect::<Vec<_>>();
    volumes.sort_by(|a, b| {
        a.drive
            .to_ascii_lowercase()
            .cmp(&b.drive.to_ascii_lowercase())
    });
    Ok(volumes)
}

fn archive_target_assessment(
    mount: &str,
    free_bytes: u64,
    removable: bool,
    read_only: bool,
    system_volume: bool,
) -> (bool, String) {
    let reason = if drive_root(mount).is_none() {
        "non-drive-mount"
    } else if system_volume {
        "system-volume"
    } else if read_only {
        "read-only"
    } else if removable {
        "removable"
    } else if free_bytes < MIN_ARCHIVE_FREE_BYTES {
        "insufficient-space"
    } else {
        "eligible"
    };
    (reason == "eligible", reason.to_string())
}

fn same_drive_root(left: &str, right: &str) -> bool {
    drive_root(left) == drive_root(right)
}

fn drive_root(value: &str) -> Option<String> {
    let value = value.trim();
    let bytes = value.as_bytes();
    if bytes.len() < 2 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' {
        return None;
    }
    Some(format!("{}:", (bytes[0] as char).to_ascii_uppercase()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn c_drive_risk_levels_follow_free_space_thresholds() {
        let gib = 1024_u64.pow(3);
        assert_eq!(risk_for_space(100 * gib, 4 * gib), "critical");
        assert_eq!(risk_for_space(100 * gib, 9 * gib), "high");
        assert_eq!(risk_for_space(100 * gib, 18 * gib), "medium");
        assert_eq!(risk_for_space(100 * gib, 40 * gib), "low");
    }

    #[test]
    fn archive_targets_exclude_system_read_only_removable_and_non_drive_mounts() {
        let gib = 1024_u64.pow(3);
        assert_eq!(
            archive_target_assessment("D:\\", 10 * gib, false, false, false),
            (true, "eligible".to_string())
        );
        assert_eq!(
            archive_target_assessment("C:\\", 10 * gib, false, false, true).1,
            "system-volume"
        );
        assert_eq!(
            archive_target_assessment("E:\\", 10 * gib, false, true, false).1,
            "read-only"
        );
        assert_eq!(
            archive_target_assessment("F:\\", 10 * gib, true, false, false).1,
            "removable"
        );
        assert_eq!(
            archive_target_assessment(r"\\server\share", 10 * gib, false, false, false).1,
            "non-drive-mount"
        );
        assert_eq!(
            archive_target_assessment("G:\\", 128 * 1024 * 1024, false, false, false).1,
            "insufficient-space"
        );
    }

    #[test]
    fn drive_root_comparison_is_case_and_separator_independent() {
        assert!(same_drive_root("c:\\", "C:"));
        assert!(!same_drive_root("D:\\", "C:"));
        assert_eq!(drive_root(r"\\server\share"), None);
    }
}
