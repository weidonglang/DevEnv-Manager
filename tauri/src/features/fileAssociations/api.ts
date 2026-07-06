import { invoke } from "../../core/invoke";
import type {
  FileAssociationAppSearchResult,
  FileAssociationApplyResult,
  FileAssociationBackupSummary,
  FileAssociationPlan,
  FileAssociationPlanRequest,
  FileAssociationReport,
} from "../../types";

export function scanAssociations(): Promise<FileAssociationReport> {
  return invoke<FileAssociationReport>("scan_file_associations");
}

export function listAssociationBackups(): Promise<FileAssociationBackupSummary[]> {
  return invoke<FileAssociationBackupSummary[]>("list_file_association_backups");
}

export function searchAssociationApp(query: string, extension: string): Promise<FileAssociationAppSearchResult> {
  return invoke<FileAssociationAppSearchResult>("search_file_association_app", { query, extension });
}

export function createAssociationPlan(request: FileAssociationPlanRequest): Promise<FileAssociationPlan> {
  return invoke<FileAssociationPlan>("create_file_association_plan", { request });
}

export function applyAssociationPlan(plan: FileAssociationPlan, confirmationToken: string): Promise<FileAssociationApplyResult> {
  return invoke<FileAssociationApplyResult>("apply_file_association_plan", { plan, confirmationToken });
}

export function rollbackAssociationBackup(backupId: string, confirmationToken: string): Promise<FileAssociationApplyResult> {
  return invoke<FileAssociationApplyResult>("rollback_file_association_backup", { backupId, confirmationToken });
}

export function openDefaultAppsSettings(): Promise<void> {
  return invoke<void>("open_default_apps_settings");
}

export function openFileTypeSettings(): Promise<void> {
  return invoke<void>("open_file_type_settings");
}

export function exportAssociationReport(): Promise<string> {
  return invoke<string>("export_file_association_report");
}
