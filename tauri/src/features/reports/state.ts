import type { DoctorRepairPlan, DoctorRepairResult, DoctorReport } from "../../types";

export type ReportsWorkbenchState = {
  doctor: DoctorReport | null;
  doctorPlan: DoctorRepairPlan | null;
  doctorRepairResult: DoctorRepairResult | null;
  text: string;
  lastExport: string;
  lastExportPath: string;
};

export const reportsWorkbenchInitialState: ReportsWorkbenchState = {
  doctor: null,
  doctorPlan: null,
  doctorRepairResult: null,
  text: "",
  lastExport: "",
  lastExportPath: "",
};

const REPORTS_STATE_KEY = "devenv.reports.state";

export function readPersistedReportsState(): ReportsWorkbenchState {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORTS_STATE_KEY) || "null") as Partial<ReportsWorkbenchState> | null;
    if (!parsed) return { ...reportsWorkbenchInitialState };
    return {
      ...reportsWorkbenchInitialState,
      doctor: parsed.doctor ?? null,
      doctorRepairResult: parsed.doctorRepairResult ?? null,
      text: parsed.text ?? "",
      lastExport: parsed.lastExport ?? "",
      lastExportPath: parsed.lastExportPath ?? "",
    };
  } catch {
    return { ...reportsWorkbenchInitialState };
  }
}

export function persistReportsState(state: ReportsWorkbenchState): void {
  const safeState: ReportsWorkbenchState = { ...state, doctorPlan: null };
  try {
    localStorage.setItem(REPORTS_STATE_KEY, JSON.stringify(safeState));
  } catch {
    // Ignore storage quota or disabled storage; the in-memory state still works.
  }
}
