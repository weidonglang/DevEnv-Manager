import type { CommandRunResult, CommandSafetyAssessment, LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

export type ToolchainWorkbenchState = {
  report: ToolchainReport | null;
  platform: PlatformReport | null;
  system: SystemPlatformReport | null;
  services: LocalServiceStatus[];
  selectedServiceId: string;
  serviceAction: "start" | "stop" | "restart";
  serviceOperationResult: OperationResult | null;
  serviceOperationError: string;
  serviceVerification: string;
  serviceLogText: string;
  serviceLogError: string;
  servicePathResult: string;
  servicePathError: string;
  platformAction: string;
  platformValue: string;
  platformOperationResult: OperationResult | null;
  platformOperationError: string;
  platformVerification: string;
  dockerOpenResult: string;
  dockerOpenError: string;
  mysql: MySqlRepairReport | null;
  mysqlPlan: MySqlRepairPlan | null;
  mysqlResult: OperationResult | null;
  operationError: string;
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
  selectedServiceId: "",
  serviceAction: "restart",
  serviceOperationResult: null,
  serviceOperationError: "",
  serviceVerification: "",
  serviceLogText: "",
  serviceLogError: "",
  servicePathResult: "",
  servicePathError: "",
  platformAction: "docker_update",
  platformValue: "",
  platformOperationResult: null,
  platformOperationError: "",
  platformVerification: "",
  dockerOpenResult: "",
  dockerOpenError: "",
  mysql: null,
  mysqlPlan: null,
  mysqlResult: null,
  operationError: "",
  learningCommand: "java -version",
  learningSafety: null,
  learningResult: null,
  learningError: "",
  errors: {},
};
