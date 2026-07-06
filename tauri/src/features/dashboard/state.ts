import type { AppSnapshot, EnvHealthCheck, PortRecord, PowerShellResult, UpdateCheckResult } from "../../types";

export type DashboardDataError = {
  snapshot?: string;
  health?: string;
  ports?: string;
  powershell?: string;
  update?: string;
};

export type DashboardState = {
  snapshot: AppSnapshot | null;
  health: EnvHealthCheck[];
  ports: PortRecord[];
  powershell: PowerShellResult | null;
  update: UpdateCheckResult | null;
  portStatus: "idle" | "cached" | "unavailable";
  errors: DashboardDataError;
  loading: boolean;
};

export const dashboardInitialState: DashboardState = {
  snapshot: null,
  health: [],
  ports: [],
  powershell: null,
  update: null,
  portStatus: "idle",
  errors: {},
  loading: false,
};
