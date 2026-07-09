import type { CleanupArchitecture, CleanupPlan, CleanupResult, CleanupScanReport, ExpansionPlan, ExpansionResult, FolderUsageReport, LargeFileItem, MaintenanceOverview, MovePlan, PartitionLayoutReport, RollbackRecord } from "../../types";

export type CleanupWorkbenchState = {
  scan: CleanupScanReport | null;
  architecture: CleanupArchitecture | null;
  overview: MaintenanceOverview | null;
  partition: PartitionLayoutReport | null;
  plan: CleanupPlan | null;
  cleanupResult: CleanupResult | null;
  movePlan: MovePlan | null;
  moveSource: string;
  moveTargetDrive: string;
  moveMode: string;
  expansionPlan: ExpansionPlan | null;
  expansionResult: ExpansionResult | null;
  desktop: FolderUsageReport | null;
  downloads: FolderUsageReport | null;
  largeFiles: LargeFileItem[];
  largeFilesPage: number;
  rollbackRecords: RollbackRecord[];
  selectedIds: string[];
  errors: Record<string, string>;
};

export const cleanupWorkbenchInitialState: CleanupWorkbenchState = {
  scan: null,
  architecture: null,
  overview: null,
  partition: null,
  plan: null,
  cleanupResult: null,
  movePlan: null,
  moveSource: "",
  moveTargetDrive: "D",
  moveMode: "archive",
  expansionPlan: null,
  expansionResult: null,
  desktop: null,
  downloads: null,
  largeFiles: [],
  largeFilesPage: 1,
  rollbackRecords: [],
  selectedIds: [],
  errors: {},
};
