import type { CleanupScanReport } from "../../types";

export type CleanupWorkbenchState = {
  scan: CleanupScanReport | null;
  selectedIds: string[];
};

export const cleanupWorkbenchInitialState: CleanupWorkbenchState = {
  scan: null,
  selectedIds: [],
};
