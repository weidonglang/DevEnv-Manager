import type { LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

export type ToolchainWorkbenchState = {
  report: ToolchainReport | null;
  platform: PlatformReport | null;
  system: SystemPlatformReport | null;
  services: LocalServiceStatus[];
  mysql: MySqlRepairReport | null;
  mysqlPlan: MySqlRepairPlan | null;
};

export const toolchainWorkbenchInitialState: ToolchainWorkbenchState = {
  report: null,
  platform: null,
  system: null,
  services: [],
  mysql: null,
  mysqlPlan: null,
};
