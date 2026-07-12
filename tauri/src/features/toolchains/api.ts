import { invoke } from "../../core/invoke";
import type { CacheEntry, CommandRunResult, CommandSafetyAssessment, LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, NetworkDiagnostics, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

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

export function runToolchainAction(action: string, value: string | null, secondary: string | null, confirmationToken: string | null): Promise<OperationResult> {
  return invoke<OperationResult>("run_toolchain_action", { action, value, secondary, confirmationToken });
}

export function runPlatformToolchainAction(action: string, value: string | null, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("run_platform_action", { action, value, confirmationToken });
}

export function runChsrcAction(action: string, target: string, source: string | null, confirmationToken: string | null): Promise<OperationResult> {
  return invoke<OperationResult>("run_chsrc_action", { action, target, source, confirmationToken });
}

export function inspectNetworkDiagnostics(): Promise<NetworkDiagnostics> {
  return invoke<NetworkDiagnostics>("network_diagnostics");
}

export function inspectCacheEntries(calculateHash = true): Promise<CacheEntry[]> {
  return invoke<CacheEntry[]>("cache_entries", { calculateHash });
}

export function clearToolchainDownloadCache(confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("clear_download_cache", { confirmationToken });
}

export function inspectCommandSafety(command: string): Promise<CommandSafetyAssessment> {
  return invoke<CommandSafetyAssessment>("inspect_command_safety", { command });
}

export function runLearningCheck(command: string): Promise<CommandRunResult> {
  return invoke<CommandRunResult>("run_learning_check", { command });
}
