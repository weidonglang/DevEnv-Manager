import { invoke } from "../../core/invoke";
import type { AppSnapshot, EnvHealthCheck, PortRecord, PowerShellResult, UpdateCheckResult } from "../../types";

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

export function getPortSummary(timeoutMs = 3000): Promise<PortRecord[]> {
  return withTimeout(invoke<PortRecord[]>("scan_ports"), timeoutMs, "Port scan timed out");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
