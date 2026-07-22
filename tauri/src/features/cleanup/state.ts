import type { AppUsageReport, ArchivePlanItem, CleanupArchitecture, CleanupPlan, CleanupResult, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionPlan, ExpansionResult, FolderUsageReport, GenericArchivePlan, GenericArchiveResult, LargeFileItem, MaintenanceOverview, MovePlan, MoveResult, PartitionLayoutReport, RecycleBinCleanupPlan, RecycleBinCleanupResult, RecycleBinReport, RollbackRecord } from "../../types";

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
  desktopWorkflowNotice: string;
  recycleBin: RecycleBinReport | null;
  recycleBinSelectedDrives: string[];
  recycleBinPlan: RecycleBinCleanupPlan | null;
  recycleBinResult: RecycleBinCleanupResult | null;
  recycleBinOperationMessage: string;
  downloadsArchivePlan: MovePlan | null;
  downloadsArchiveResult: MoveResult | null;
  downloadsRecoveryResult: string;
  downloadsTargetDrive: string;
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
  moveTargetDrive: "",
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
  desktopTargetDrive: "",
  desktopRecoveryResult: "",
  desktopWorkflowNotice: "",
  recycleBin: null,
  recycleBinSelectedDrives: [],
  recycleBinPlan: null,
  recycleBinResult: null,
  recycleBinOperationMessage: "",
  downloadsArchivePlan: null,
  downloadsArchiveResult: null,
  downloadsRecoveryResult: "",
  downloadsTargetDrive: "",
  appUsage: null,
  archiveItems: [],
  archivePlan: null,
  archiveResult: null,
  archiveSource: "",
  archiveSourceLabel: "manual selection",
  archiveTargetDrive: "",
  rollbackRecords: [],
  selectedIds: [],
  errors: {},
};
