import { invoke } from "../../core/invoke";
import type { CommandRunResult, CommandSafetyAssessment, LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

export function inspectToolchains(): Promise<ToolchainReport> {
  return invoke<ToolchainReport>("inspect_toolchains");
}

export function inspectPlatformToolchains(): Promise<PlatformReport> {
  return invoke<PlatformReport>("inspect_platform_toolchains");
}

export function inspectSystemPlatforms(): Promise<SystemPlatformReport> {
  return invoke<SystemPlatformReport>("inspect_system_platforms");
}

export function inspectLocalServices(): Promise<LocalServiceStatus[]> {
  return invoke<LocalServiceStatus[]>("inspect_local_services");
}

export function inspectMySqlRepair(): Promise<MySqlRepairReport> {
  return invoke<MySqlRepairReport>("inspect_mysql_repair");
}

export function createMySqlRepairPlan(candidateId: string, action: string): Promise<MySqlRepairPlan> {
  return invoke<MySqlRepairPlan>("create_mysql_repair_plan", { candidateId, action });
}

export function executeMySqlRepairPlan(planId: string, backupDestination: string, confirmationToken: string | null): Promise<OperationResult> {
  return invoke<OperationResult>("execute_mysql_repair_plan", { planId, backupDestination, confirmationToken });
}

export function manageLocalService(serviceName: string, action: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("manage_local_service", { serviceName, action, confirmationToken });
}

export function manageSystemPlatform(action: string, value: string | null, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("manage_system_platform", { action, value, confirmationToken });
}

export function openDockerDesktop(): Promise<OperationResult> {
  return invoke<OperationResult>("open_docker_desktop");
}

export function localServiceLogs(serviceName: string): Promise<string> {
  return invoke<string>("local_service_logs", { serviceName });
}

export function openLocalServiceDirectory(serviceName: string): Promise<OperationResult> {
  return invoke<OperationResult>("open_local_service_directory", { serviceName });
}

export function openServiceLogPath(path: string): Promise<OperationResult> {
  return invoke<OperationResult>("open_analysis_path", { path });
}

export function inspectCommandSafety(command: string): Promise<CommandSafetyAssessment> {
  return invoke<CommandSafetyAssessment>("inspect_command_safety", { command });
}

export function runLearningCheck(command: string): Promise<CommandRunResult> {
  return invoke<CommandRunResult>("run_learning_check", { command });
}
