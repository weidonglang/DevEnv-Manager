import type { DoctorReport } from "../../types";

export type ReportsWorkbenchState = {
  doctor: DoctorReport | null;
  text: string;
  lastExport: string;
  lastExportPath: string;
};

export const reportsWorkbenchInitialState: ReportsWorkbenchState = {
  doctor: null,
  text: "",
  lastExport: "",
  lastExportPath: "",
};
