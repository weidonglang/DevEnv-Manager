import type { CleanupArchitecture, CleanupPlan, CleanupScanReport, MaintenanceOverview, MovePlan, RollbackRecord } from "../../types";

export type CleanupWorkbenchState = {
  scan: CleanupScanReport | null;
  architecture: CleanupArchitecture | null;
  overview: MaintenanceOverview | null;
  plan: CleanupPlan | null;
  movePlan: MovePlan | null;
  rollbackRecords: RollbackRecord[];
  selectedIds: string[];
};

export const cleanupWorkbenchInitialState: CleanupWorkbenchState = {
  scan: null,
  architecture: null,
  overview: null,
  plan: null,
  movePlan: null,
  rollbackRecords: [],
  selectedIds: [],
};
