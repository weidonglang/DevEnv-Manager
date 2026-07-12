import { invoke } from "../../core/invoke";
import type { EnvBackupDiff, EnvBackupRecord, EnvHealthCheck, EnvReliabilitySnapshot, EnvRepairPlan, EnvRepairResult, EnvironmentBackupInfo, EnvironmentConfigPreview, OperationResult, PythonAnalysis, PythonRepairPlan } from "../../types";

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

export function inspectEnvBackup(backupName: string): Promise<EnvBackupDiff> {
  return invoke<EnvBackupDiff>("inspect_env_backup", { backupName });
}

export function restoreEnvBackup(backupName: string, confirmationToken: string): Promise<EnvRepairResult> {
  return invoke<EnvRepairResult>("restore_env_backup", { backupName, confirmationToken });
}

export function restoreEnvironmentBackup(fileName: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("restore_environment_backup", { fileName, confirmationToken });
}

export function analyzePythonEnvironment(): Promise<PythonAnalysis> {
  return invoke<PythonAnalysis>("analyze_python_environment");
}

export function previewPythonRepair(repairPip: boolean, repairPath: boolean): Promise<PythonRepairPlan> {
  return invoke<PythonRepairPlan>("preview_python_repair", { repairPip, repairPath });
}

export function applyPythonRepair(planId: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("apply_python_repair", { planId, confirmationToken });
}

export function openPythonAliasSettings(): Promise<OperationResult> {
  return invoke<OperationResult>("open_python_alias_settings");
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
