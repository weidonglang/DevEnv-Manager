import type { DashboardSnapshot } from "./types";

export type DashboardState = {
  snapshot: DashboardSnapshot | null;
  loading: boolean;
};

export const dashboardInitialState: DashboardState = {
  snapshot: null,
  loading: false,
};
