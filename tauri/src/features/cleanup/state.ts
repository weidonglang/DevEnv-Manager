import type { CleanupArchitecture, CleanupPlan, CleanupResult, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionPlan, ExpansionResult, FolderUsageReport, LargeFileItem, MaintenanceOverview, MovePlan, MoveResult, PartitionLayoutReport, RollbackRecord } from "../../types";

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
  downloadsArchivePlan: MovePlan | null;
  downloadsArchiveResult: MoveResult | null;
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
  downloadsArchivePlan: null,
  downloadsArchiveResult: null,
  rollbackRecords: [],
  selectedIds: [],
  errors: {},
};
