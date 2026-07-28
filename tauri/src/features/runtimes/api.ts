import { invoke } from "../../core/invoke";
import type { JdkDistribution, OperationResult, RuntimeInfo, RuntimeStrongVerificationReport, RuntimeSwitchPlan, RuntimeSwitchResult, ValidationCheck } from "../../types";

export function discoverRuntimes(): Promise<RuntimeInfo[]> {
  return invoke<RuntimeInfo[]>("discover_runtimes");
}

export function getJdkDistributions(): Promise<JdkDistribution[]> {
  return invoke<JdkDistribution[]>("jdk_distributions");
}

export function inspectRuntimeStrongVerification(): Promise<RuntimeStrongVerificationReport> {
  return invoke<RuntimeStrongVerificationReport>("inspect_runtime_strong_verification");
}

export function exportRuntimeVerificationReport(format: "markdown" | "json"): Promise<string> {
  return invoke<string>("export_runtime_verification_report", { format });
}

export function installRuntime(command: "install_jdk" | "install_node" | "install_python" | "install_go" | "install_maven" | "install_gradle", args: Record<string, unknown>): Promise<OperationResult> {
  return invoke<OperationResult>(command, args);
}

export function createRuntimeSwitchPlan(runtimeId: string, switchMode: RuntimeSwitchPlan["switchMode"], projectRoot: string | null = null): Promise<RuntimeSwitchPlan> {
  return invoke<RuntimeSwitchPlan>("create_runtime_switch_plan", { runtimeId, switchMode, projectRoot });
}

export function executeRuntimeSwitchPlan(planId: string, confirmationToken: string): Promise<RuntimeSwitchResult> {
  return invoke<RuntimeSwitchResult>("execute_runtime_switch_plan", { planId, confirmationToken });
}

export function uninstallRuntime(kind: string, version: string, path: string | null, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("uninstall_runtime", { kind, version, path, confirmationToken });
}

export function openRuntimeDirectory(path: string): Promise<OperationResult> {
  return invoke<OperationResult>("open_analysis_path", { path });
}

export function openAppsFeatures(): Promise<OperationResult> {
  return invoke<OperationResult>("open_apps_features");
}

export function verifyExternalJdk(jdkPath: string): Promise<ValidationCheck[]> {
  return invoke<ValidationCheck[]>("verify_external_jdk", { jdkPath });
}
