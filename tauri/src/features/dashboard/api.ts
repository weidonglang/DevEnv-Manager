import { invoke } from "../../core/invoke";
import type { AppSnapshot, EnvHealthCheck, PortScanSnapshot, PowerShellResult, UpdateCheckResult } from "../../types";

export async function getAppSnapshot(): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("app_snapshot");
}

export async function getEnvironmentHealth(): Promise<EnvHealthCheck[]> {
  return invoke<EnvHealthCheck[]>("environment_health");
}

export async function getPowerShellStatus(): Promise<PowerShellResult> {
  return invoke<PowerShellResult>("powershell_runner_status");
}

export async function getEffectiveRuntimeSummary(): Promise<{ health: EnvHealthCheck[]; powershell: PowerShellResult }> {
  const [health, powershell] = await Promise.all([getEnvironmentHealth(), getPowerShellStatus()]);
  return { health, powershell };
}

export function getUpdateStatus(): Promise<UpdateCheckResult> {
  return invoke<UpdateCheckResult>("check_for_updates");
}

export function getPortScanStatus(): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("port_scan_status");
}

export function forcePortScan(scope: "recommended" | "full" = "recommended"): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("scan_ports", { force: true, scope });
}

export function enrichPortScan(scanId: string): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("enrich_port_scan", { scanId });
}
