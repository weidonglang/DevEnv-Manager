import { invoke } from "../../core/invoke";
import type { EnvBackupRecord, EnvHealthCheck, EnvReliabilitySnapshot, EnvRepairPlan, EnvRepairResult, EnvironmentBackupInfo, EnvironmentConfigPreview, OperationResult } from "../../types";

export function inspectEnvironmentReliability(): Promise<EnvReliabilitySnapshot> {
  return invoke<EnvReliabilitySnapshot>("inspect_env_reliability");
}

export function environmentHealth(): Promise<EnvHealthCheck[]> {
  return invoke<EnvHealthCheck[]>("environment_health");
}

export function previewUserEnvironmentConfiguration(): Promise<EnvironmentConfigPreview> {
  return invoke<EnvironmentConfigPreview>("preview_user_environment_configuration");
}

export function listEnvBackups(): Promise<EnvBackupRecord[]> {
  return invoke<EnvBackupRecord[]>("list_env_backups");
}

export function listEnvironmentBackups(): Promise<EnvironmentBackupInfo[]> {
  return invoke<EnvironmentBackupInfo[]>("list_environment_backups");
}

export function createJavaStabilizePlan(jdkPath: string | null): Promise<EnvRepairPlan> {
  return invoke<EnvRepairPlan>("create_java_stabilize_plan", { jdkPath });
}

export function applyEnvRepairPlan(plan: EnvRepairPlan, confirmationToken: string): Promise<EnvRepairResult> {
  return invoke<EnvRepairResult>("apply_env_repair_plan", { plan, confirmationToken });
}

export function cleanupPathEntries(confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("cleanup_path_entries", { confirmationToken });
}
