use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemorySummary {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub used_percent: f64,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskVolumeInfo {
    pub drive: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub used_percent: f64,
    pub file_system: Option<String>,
    pub disk_kind: String,
    pub removable: bool,
    pub read_only: bool,
    pub system_volume: bool,
    pub archive_target_eligible: bool,
    pub archive_target_reason: String,
    pub risk: String,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinReport {
    pub generated_at: String,
    pub item_count: usize,
    pub total_bytes: u64,
    pub recoverable_count: usize,
    pub items: Vec<RecycleBinItem>,
    pub volumes: Vec<RecycleBinVolumeSummary>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinItem {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub recycle_path: String,
    pub source_drive: String,
    pub size: u64,
    pub deleted_at: String,
    pub recoverable: bool,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinVolumeSummary {
    pub drive: String,
    pub item_count: usize,
    pub total_bytes: u64,
    pub recoverable_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinCleanupPlan {
    pub plan_id: String,
    pub created_at: String,
    pub selected_drives: Vec<String>,
    pub item_ids: Vec<String>,
    pub item_count: usize,
    pub estimated_bytes: u64,
    pub snapshot_fingerprint: String,
    pub risk_level: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinCleanupResult {
    pub plan_id: String,
    pub success: bool,
    pub before_item_count: usize,
    pub before_bytes: u64,
    pub after_item_count: usize,
    pub after_bytes: u64,
    pub cleaned_items: usize,
    pub cleaned_bytes: u64,
    pub selected_drives: Vec<String>,
    pub failures: Vec<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceOverview {
    pub c_drive: DiskVolumeInfo,
    pub volumes: Vec<DiskVolumeInfo>,
    pub safe_clean_estimate: u64,
    pub move_estimate: u64,
    pub dev_cache_estimate: u64,
    pub large_file_count: usize,
    pub startup_count: usize,
    pub memory_summary: Option<MemorySummary>,
    pub risk_level: String,
    pub summary: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupScanReport {
    pub generated_at: String,
    pub total_bytes: u64,
    pub total_items: usize,
    pub categories: Vec<CleanupCategoryScan>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCategoryScan {
    pub id: String,
    pub name: String,
    pub description: String,
    pub risk: String,
    pub scan_only: bool,
    pub cleanable: bool,
    pub enabled_by_default: bool,
    pub total_bytes: u64,
    pub item_count: usize,
    pub items: Vec<CleanupItem>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupItem {
    pub id: String,
    pub path: String,
    pub size: u64,
    pub modified_at: Option<String>,
    pub source: String,
    pub reason: String,
    pub risk: String,
    pub cleanable: bool,
    pub selected_by_default: bool,
    pub skipped_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CleanupPlan {
    pub plan_id: String,
    pub created_at: String,
    pub selected_items: Vec<CleanupPlanItem>,
    pub estimated_bytes: u64,
    pub risk_summary: Vec<String>,
    pub requires_admin: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CleanupPlanItem {
    pub item_id: String,
    pub path: String,
    pub size: u64,
    pub category_id: String,
    pub risk: String,
    pub action: String,
    pub reversible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub plan_id: String,
    pub started_at: String,
    pub finished_at: String,
    pub success: bool,
    pub cleaned_bytes: u64,
    pub cleaned_items: usize,
    pub skipped_items: usize,
    pub failed_items: usize,
    pub failures: Vec<CleanupFailure>,
    pub report_markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupFailure {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LargeFileItem {
    pub file_name: String,
    pub path: String,
    pub directory: String,
    pub extension: String,
    pub size: u64,
    pub modified_at: Option<String>,
    pub file_type: String,
    pub source_category: String,
    pub exists: bool,
    pub can_open: bool,
    pub can_locate: bool,
    pub open_status: String,
    pub suggestion: String,
    pub risk: String,
    pub actionable: bool,
    pub blocked_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub size: u64,
    pub hash: String,
    pub files: Vec<DuplicateFileItem>,
    pub reclaimable_estimate: u64,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateFileItem {
    pub path: String,
    pub modified_at: Option<String>,
    pub keep_suggestion: String,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FolderUsageItem {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub category: String,
    pub suggestion: String,
    pub details: Vec<LargeFileItem>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FolderUsageReport {
    pub name: String,
    pub path: String,
    pub total_bytes: u64,
    pub file_count: usize,
    pub folder_count: usize,
    pub protected_count: usize,
    pub categories: Vec<FolderUsageItem>,
    pub top_files: Vec<LargeFileItem>,
    pub suggestions: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppUsageReport {
    pub wechat: Option<AppUsageItem>,
    pub qq: Option<AppUsageItem>,
    pub browsers: Vec<AppUsageItem>,
    pub net_disks: Vec<AppUsageItem>,
    pub video_editors: Vec<AppUsageItem>,
    pub game_platforms: Vec<AppUsageItem>,
    pub installed_software: Vec<InstalledSoftwareUsage>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppUsageItem {
    pub name: String,
    pub detected: bool,
    pub path: String,
    pub size: u64,
    pub categories: Vec<FolderUsageItem>,
    pub safe_actions: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InstalledSoftwareUsage {
    pub name: String,
    pub publisher: String,
    pub install_location: String,
    pub estimated_size: u64,
    pub uninstall_command_exists: bool,
    pub suggestion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MovePlan {
    pub plan_id: String,
    pub created_at: String,
    pub source: String,
    pub target: String,
    pub mode: String,
    pub estimated_bytes: u64,
    pub item_count: usize,
    pub risk: String,
    pub requires_admin: bool,
    pub reversible: bool,
    #[serde(default)]
    pub selected_items: Vec<MovePlanItem>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MovePlanItem {
    pub source: String,
    pub target: String,
    pub size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MoveReceipt {
    pub source: String,
    pub target: String,
    pub size: u64,
    pub source_sha256: String,
    pub target_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MoveResult {
    pub plan_id: String,
    pub success: bool,
    pub moved_bytes: u64,
    pub moved_items: usize,
    pub source_backup: Option<String>,
    pub target_path: String,
    pub junction_created: bool,
    pub failures: Vec<String>,
    pub rollback_id: Option<String>,
    #[serde(default)]
    pub receipts: Vec<MoveReceipt>,
    pub report_markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RollbackRecord {
    pub rollback_id: String,
    pub created_at: String,
    pub operation_type: String,
    pub source: String,
    pub target: String,
    pub backup_path: Option<String>,
    pub junction_path: Option<String>,
    pub reversible: bool,
    #[serde(default)]
    pub moved_files: Vec<MoveReceipt>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PartitionLayoutReport {
    pub system_disk: String,
    pub c_partition: PartitionInfo,
    pub adjacent_right: Option<PartitionInfo>,
    pub unallocated_after_c: Option<u64>,
    pub recovery_partition_blocks: bool,
    pub d_partition_same_disk: bool,
    pub bitlocker_suspected: bool,
    pub can_extend_safely: bool,
    pub can_delete_empty_adjacent_partition: bool,
    pub result_level: String,
    pub explanation: String,
    pub suggested_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PartitionInfo {
    pub disk_index: String,
    pub partition_index: String,
    pub drive_letter: Option<String>,
    pub size: u64,
    pub file_system: Option<String>,
    pub partition_type: String,
    pub is_boot: bool,
    pub is_system: bool,
    pub is_recovery: bool,
    pub is_empty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExpansionPlan {
    pub plan_id: String,
    pub mode: String,
    pub can_execute: bool,
    pub requires_admin: bool,
    pub estimated_added_bytes: u64,
    pub commands_preview: Vec<String>,
    pub risks: Vec<String>,
    pub backup_required: bool,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExpansionResult {
    pub plan_id: String,
    pub success: bool,
    pub before_free: u64,
    pub after_free: u64,
    pub before_total: u64,
    pub after_total: u64,
    pub output: String,
    pub report_markdown: String,
}
