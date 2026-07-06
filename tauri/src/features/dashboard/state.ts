import type { AppSnapshot, EnvHealthCheck, PortRecord, PowerShellResult, UpdateCheckResult } from "../../types";

export type DashboardState = {
  snapshot: AppSnapshot | null;
  health: EnvHealthCheck[];
  ports: PortRecord[];
  powershell: PowerShellResult | null;
  update: UpdateCheckResult | null;
  loading: boolean;
};

export const dashboardInitialState: DashboardState = {
  snapshot: null,
  health: [],
  ports: [],
  powershell: null,
  update: null,
  loading: false,
};
