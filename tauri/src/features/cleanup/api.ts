import { invoke } from "../../core/invoke";
import type { CleanupArchitecture, CleanupPlan, CleanupResult, CleanupScanReport, ExpansionPlan, ExpansionResult, FolderUsageReport, LargeFileItem, MaintenanceOverview, MovePlan, MoveResult, OperationResult, PartitionLayoutReport, RollbackRecord } from "../../types";

export function fileDirectory(path: string, directory?: string) {
  return directory || path.replace(/[\\/][^\\/]*$/, "");
}

export function storageCleanupArchitecture(): Promise<CleanupArchitecture> {
  return invoke<CleanupArchitecture>("storage_cleanup_architecture");
}

export function inspectMaintenanceOverview(): Promise<MaintenanceOverview> {
  return invoke<MaintenanceOverview>("inspect_maintenance_overview");
}

export function scanCleanupTargets(): Promise<CleanupScanReport> {
  return invoke<CleanupScanReport>("scan_cleanup_targets");
}

export function createCleanupPlan(selectedItemIds: string[]): Promise<CleanupPlan> {
  return invoke<CleanupPlan>("create_cleanup_plan", { selectedItemIds });
}

export function cleanSelectedTargets(plan: CleanupPlan, confirmationToken: string): Promise<CleanupResult> {
  return invoke<CleanupResult>("clean_selected_targets", { plan, confirmationToken });
}

export function clearDownloadCache(confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("clear_download_cache", { confirmationToken });
}

export function cleanDevCache(tool: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("clean_dev_cache", { tool, confirmationToken });
}

export function createMovePlan(source: string, targetDrive: string, mode: string): Promise<MovePlan> {
  return invoke<MovePlan>("create_move_plan", { source, targetDrive, mode });
}

export function executeMovePlan(plan: MovePlan, confirmationToken: string): Promise<MoveResult> {
  return invoke<MoveResult>("execute_move_plan", { plan, confirmationToken });
}

export function rollbackMove(rollbackId: string, confirmationToken: string): Promise<MoveResult> {
  return invoke<MoveResult>("rollback_move", { rollbackId, confirmationToken });
}

export function inspectPartitionLayout(): Promise<PartitionLayoutReport> {
  return invoke<PartitionLayoutReport>("inspect_partition_layout");
}

export function createCDriveExpansionPlan(): Promise<ExpansionPlan> {
  return invoke<ExpansionPlan>("create_c_drive_expansion_plan");
}

export function executeCDriveExpansion(plan: ExpansionPlan, confirmationToken: string): Promise<ExpansionResult> {
  return invoke<ExpansionResult>("execute_c_drive_expansion", { plan, confirmationToken });
}

export function listRollbackRecords(): Promise<RollbackRecord[]> {
  return invoke<RollbackRecord[]>("list_rollback_records");
}

export function inspectDesktop(): Promise<FolderUsageReport> {
  return invoke<FolderUsageReport>("inspect_desktop");
}

export function inspectDownloads(): Promise<FolderUsageReport> {
  return invoke<FolderUsageReport>("inspect_downloads");
}

export function scanLargeFiles(root: string, minSizeMb: number): Promise<LargeFileItem[]> {
  return invoke<LargeFileItem[]>("scan_large_files", { root, minSizeMb, limit: 100 });
}

export function openAnalysisPath(path: string): Promise<OperationResult> {
  return invoke<OperationResult>("open_analysis_path", { path });
}
