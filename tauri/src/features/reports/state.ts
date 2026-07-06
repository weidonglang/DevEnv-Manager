import type { ReportWorkbenchSnapshot } from "./types";

export type ReportsWorkbenchState = {
  snapshot: ReportWorkbenchSnapshot | null;
};

export const reportsWorkbenchInitialState: ReportsWorkbenchState = {
  snapshot: null,
};
