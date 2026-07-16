import type { LocalServiceStatus, PortHistorySummary, PortRecord, PortResolutionPlan, PortResolutionResult } from "../../types";

export type PortsWorkbenchState = {
  records: PortRecord[];
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
