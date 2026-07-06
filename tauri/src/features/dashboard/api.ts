import { invoke } from "../../core/invoke";
import type { AppSnapshot, EnvHealthCheck, PortRecord, PowerShellResult, UpdateCheckResult } from "../../types";

export async function getAppSnapshot(): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("app_snapshot");
}

export async function getEffectiveRuntimeSummary(): Promise<{ health: EnvHealthCheck[]; ports: PortRecord[]; powershell: PowerShellResult }> {
  const [health, ports, powershell] = await Promise.all([
    invoke<EnvHealthCheck[]>("environment_health"),
    invoke<PortRecord[]>("scan_ports"),
    invoke<PowerShellResult>("powershell_runner_status"),
  ]);
  return { health, ports, powershell };
}

export function getUpdateStatus(): Promise<UpdateCheckResult> {
  return invoke<UpdateCheckResult>("check_for_updates");
}
