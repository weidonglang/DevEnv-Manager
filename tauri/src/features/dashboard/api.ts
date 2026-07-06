import type { DashboardSnapshot } from "./types";

export function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  return Promise.reject(new Error("Dashboard API is provided by the legacy bootstrap during this refactor."));
}
