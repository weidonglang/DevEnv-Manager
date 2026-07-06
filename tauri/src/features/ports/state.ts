import type { PortRecord } from "../../types";

export type PortsWorkbenchState = {
  records: PortRecord[];
  selectedPort: number | null;
};

export const portsWorkbenchInitialState: PortsWorkbenchState = {
  records: [],
  selectedPort: null,
};
