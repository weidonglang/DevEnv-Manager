import { invoke } from "../../core/invoke";
import type { LocalServiceStatus, MySqlRepairPlan, MySqlRepairReport, OperationResult, PlatformReport, SystemPlatformReport, ToolchainReport } from "../../types";

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
