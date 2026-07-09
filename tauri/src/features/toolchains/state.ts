import type { CommandRunResult, CommandSafetyAssessment, LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

export type ToolchainWorkbenchState = {
  report: ToolchainReport | null;
  platform: PlatformReport | null;
  system: SystemPlatformReport | null;
  services: LocalServiceStatus[];
  mysql: MySqlRepairReport | null;
  mysqlPlan: MySqlRepairPlan | null;
  mysqlResult: OperationResult | null;
  learningCommand: string;
  learningSafety: CommandSafetyAssessment | null;
  learningResult: CommandRunResult | null;
  learningError: string;
  errors: Partial<Record<"report" | "platform" | "system" | "services" | "mysql", string>>;
};

export const toolchainWorkbenchInitialState: ToolchainWorkbenchState = {
  report: null,
  platform: null,
  system: null,
  services: [],
  mysql: null,
  mysqlPlan: null,
  mysqlResult: null,
  learningCommand: "java -version",
  learningSafety: null,
  learningResult: null,
  learningError: "",
  errors: {},
};
