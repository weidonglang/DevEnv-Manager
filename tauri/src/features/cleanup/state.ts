import type { AppUsageReport, ArchivePlanItem, CleanupArchitecture, CleanupPlan, CleanupResult, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionPlan, ExpansionResult, FolderUsageReport, GenericArchivePlan, GenericArchiveResult, LargeFileItem, MaintenanceOverview, MovePlan, MoveResult, PartitionLayoutReport, RollbackRecord } from "../../types";

export type DuplicateScanStatus = "notStarted" | "running" | "completedWithResults" | "completedEmpty" | "failed";

export type CleanupWorkbenchState = {
  scan: CleanupScanReport | null;
  architecture: CleanupArchitecture | null;
  overview: MaintenanceOverview | null;
  diskOverview: DiskVolumeInfo[];
  partition: PartitionLayoutReport | null;
  plan: CleanupPlan | null;
  cleanupResult: CleanupResult | null;
  movePlan: MovePlan | null;
  moveOperationResult: string;
  moveSource: string;
  moveTargetDrive: string;
  moveMode: string;
  expansionPlan: ExpansionPlan | null;
  expansionResult: ExpansionResult | null;
  expansionBackupReceipt: string;
  desktop: FolderUsageReport | null;
  downloads: FolderUsageReport | null;
  largeFiles: LargeFileItem[];
  largeFilesPage: number;
  duplicateGroups: DuplicateGroup[];
  duplicateGroupsPage: number;
  duplicateScanStatus: DuplicateScanStatus;
  duplicateScanRoot: string;
  duplicateScanMinSizeMb: number;
  duplicateScanElapsedMs: number;
  duplicateScanCompletedAt: string;
  desktopArchivePlan: MovePlan | null;
  desktopArchiveResult: MoveResult | null;
  desktopCleanupPlan: MovePlan | null;
  desktopCleanupResult: MoveResult | null;
  desktopSelectedPaths: string[];
  desktopTargetDrive: string;
  desktopRecoveryResult: string;
  downloadsArchivePlan: MovePlan | null;
  downloadsArchiveResult: MoveResult | null;
  appUsage: AppUsageReport | null;
  archiveItems: ArchivePlanItem[];
  archivePlan: GenericArchivePlan | null;
  archiveResult: GenericArchiveResult | null;
  archiveSource: string;
  archiveSourceLabel: string;
  archiveTargetDrive: string;
  rollbackRecords: RollbackRecord[];
  selectedIds: string[];
  errors: Record<string, string>;
};

export const cleanupWorkbenchInitialState: CleanupWorkbenchState = {
  scan: null,
  architecture: null,
  overview: null,
  diskOverview: [],
  partition: null,
  plan: null,
  cleanupResult: null,
  movePlan: null,
  moveOperationResult: "",
  moveSource: "",
  moveTargetDrive: "D",
  moveMode: "archive",
  expansionPlan: null,
  expansionResult: null,
  expansionBackupReceipt: "",
  desktop: null,
  downloads: null,
  largeFiles: [],
  largeFilesPage: 1,
  duplicateGroups: [],
  duplicateGroupsPage: 1,
  duplicateScanStatus: "notStarted",
  duplicateScanRoot: "",
  duplicateScanMinSizeMb: 100,
  duplicateScanElapsedMs: 0,
  duplicateScanCompletedAt: "",
  desktopArchivePlan: null,
  desktopArchiveResult: null,
  desktopCleanupPlan: null,
  desktopCleanupResult: null,
  desktopSelectedPaths: [],
  desktopTargetDrive: "D",
  desktopRecoveryResult: "",
  downloadsArchivePlan: null,
  downloadsArchiveResult: null,
  appUsage: null,
  archiveItems: [],
  archivePlan: null,
  archiveResult: null,
  archiveSource: "",
  archiveSourceLabel: "manual selection",
  archiveTargetDrive: "D",
  rollbackRecords: [],
  selectedIds: [],
  errors: {},
};
