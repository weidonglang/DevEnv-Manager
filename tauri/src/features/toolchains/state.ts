import type { CacheEntry, CommandRunResult, CommandSafetyAssessment, LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, NetworkDiagnostics, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

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
  toolchainActionId: string;
  toolchainActionValue: string;
  toolchainActionSecondary: string;
  toolchainOperationResult: OperationResult | null;
  toolchainOperationError: string;
  toolchainOperationVerification: string;
  mirrorTarget: string;
  mirrorAction: "set" | "auto" | "reset";
  mirrorSource: string;
  mirrorCurrent: string;
  mirrorCandidates: string;
  mirrorMeasure: string;
  mirrorResult: OperationResult | null;
  mirrorError: string;
  mirrorVerification: string;
  network: NetworkDiagnostics | null;
  cacheEntries: CacheEntry[];
  cacheInspected: boolean;
  networkCacheError: string;
  cacheOperationResult: string;
  mysql: MySqlRepairReport | null;
  mysqlCandidateId: string;
  mysqlAction: "backup" | "register_service" | "start_service" | "repair_system_schema" | "reset_root_guide" | "dump_guide";
  mysqlBackupDestination: string;
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
  toolchainActionId: "git_test_ssh",
  toolchainActionValue: "",
  toolchainActionSecondary: "",
  toolchainOperationResult: null,
  toolchainOperationError: "",
  toolchainOperationVerification: "",
  mirrorTarget: "node",
  mirrorAction: "set",
  mirrorSource: "official",
  mirrorCurrent: "",
  mirrorCandidates: "",
  mirrorMeasure: "",
  mirrorResult: null,
  mirrorError: "",
  mirrorVerification: "",
  network: null,
  cacheEntries: [],
  cacheInspected: false,
  networkCacheError: "",
  cacheOperationResult: "",
  mysql: null,
  mysqlCandidateId: "",
  mysqlAction: "backup",
  mysqlBackupDestination: "",
  mysqlPlan: null,
  mysqlResult: null,
  operationError: "",
  learningCommand: "java -version",
  learningSafety: null,
  learningResult: null,
  learningError: "",
  errors: {},
};
