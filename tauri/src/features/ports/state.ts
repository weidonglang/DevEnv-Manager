import type { LocalServiceStatus, PortHistorySummary, PortRecord, PortResolutionPlan, PortResolutionResult, PortScanSnapshot } from "../../types";

export type PortsWorkbenchState = {
  records: PortRecord[];
  snapshot: PortScanSnapshot | null;
  scanScope: "recommended" | "full";
  history: PortHistorySummary[];
  services: LocalServiceStatus[];
  plan: PortResolutionPlan | null;
  executionResult: PortResolutionResult | null;
  selectedPort: number | null;
  selectedKey: string | null;
  filter: string;
  scanError: string;
  historyError: string;
  servicesError: string;
  planError: string;
  diagnosticsResult: string;
  retryPlanRequest: { pid: number; port: number } | null;
  page: number;
};

export const portsWorkbenchInitialState: PortsWorkbenchState = {
  records: [],
  snapshot: null,
  scanScope: "recommended",
  history: [],
  services: [],
  plan: null,
  executionResult: null,
  selectedPort: null,
  selectedKey: null,
  filter: "",
  scanError: "",
  historyError: "",
  servicesError: "",
  planError: "",
  diagnosticsResult: "",
  retryPlanRequest: null,
  page: 1,
};
