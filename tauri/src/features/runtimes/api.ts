import { invoke } from "../../core/invoke";
import type { JdkDistribution, OperationResult, RuntimeInfo, RuntimeStrongVerificationReport } from "../../types";

export function discoverRuntimes(): Promise<RuntimeInfo[]> {
  return invoke<RuntimeInfo[]>("discover_runtimes");
}

export function getJdkDistributions(): Promise<JdkDistribution[]> {
  return invoke<JdkDistribution[]>("jdk_distributions");
}

export function inspectRuntimeStrongVerification(): Promise<RuntimeStrongVerificationReport> {
  return invoke<RuntimeStrongVerificationReport>("inspect_runtime_strong_verification");
}

export function installRuntime(command: "install_jdk" | "install_node" | "install_python" | "install_go", args: Record<string, unknown>): Promise<OperationResult> {
  return invoke<OperationResult>(command, args);
}

export function switchRuntime(kind: string, version: string, path: string | null, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("switch_runtime", { kind, version, path, confirmationToken });
}

export function uninstallRuntime(kind: string, version: string, path: string | null, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("uninstall_runtime", { kind, version, path, confirmationToken });
}
