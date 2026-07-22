import type { AppSnapshot, EnvHealthCheck, PortRecord, PortScanSnapshot, PowerShellResult, UpdateCheckResult } from "../../types";

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
  portSnapshot: PortScanSnapshot | null;
  powershell: PowerShellResult | null;
  update: UpdateCheckResult | null;
  portStatus: "idle" | "scanning" | "cached" | "stale" | "unavailable";
  errors: DashboardDataError;
  loading: boolean;
};

export const dashboardInitialState: DashboardState = {
  snapshot: null,
  health: [],
  ports: [],
  portSnapshot: null,
  powershell: null,
  update: null,
  portStatus: "idle",
  errors: {},
  loading: false,
};
