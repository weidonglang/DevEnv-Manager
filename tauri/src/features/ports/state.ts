import type { LocalServiceStatus, PortHistorySummary, PortRecord, PortResolutionPlan } from "../../types";

export type PortsWorkbenchState = {
  records: PortRecord[];
  history: PortHistorySummary[];
  services: LocalServiceStatus[];
  plan: PortResolutionPlan | null;
  selectedPort: number | null;
  filter: string;
};

export const portsWorkbenchInitialState: PortsWorkbenchState = {
  records: [],
  history: [],
  services: [],
  plan: null,
  selectedPort: null,
  filter: "",
};
