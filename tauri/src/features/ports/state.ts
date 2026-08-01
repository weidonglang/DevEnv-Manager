import type { LocalServiceStatus, PortHistorySummary, PortRecord, PortResolutionPlan, PortResolutionResult, PortScanSnapshot } from "../../types";
import type { PortGroupDiagnostic } from "./portGroups";

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
  actionableOnly: boolean;
  scanError: string;
  historyError: string;
  servicesError: string;
  planError: string;
  diagnosticsResult: string;
  retryPlanRequest: { groupId: string; pid: number; port: number } | null;
  scanGeneration: number;
  groupDiagnostics: PortGroupDiagnostic[];
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
  actionableOnly: true,
  scanError: "",
  historyError: "",
  servicesError: "",
  planError: "",
  diagnosticsResult: "",
  retryPlanRequest: null,
  scanGeneration: 0,
  groupDiagnostics: [],
  page: 1,
};
