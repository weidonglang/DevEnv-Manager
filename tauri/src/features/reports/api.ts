import type { ReportWorkbenchSnapshot } from "./types";

export function loadReportWorkbench(): Promise<ReportWorkbenchSnapshot> {
  return Promise.reject(new Error("Report API is provided by the legacy bootstrap during this refactor."));
}
