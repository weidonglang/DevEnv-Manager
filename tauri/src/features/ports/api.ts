import { invoke } from "../../core/invoke";
import type { LocalServiceStatus, OperationResult, PortHistorySummary, PortRecord, PortResolutionPlan, PortResolutionResult } from "../../types";

export function scanPorts(): Promise<PortRecord[]> {
  return invoke<PortRecord[]>("scan_ports");
}

export function portHistory(): Promise<PortHistorySummary[]> {
  return invoke<PortHistorySummary[]>("port_history");
}

export function createPortResolutionPlan(pid: number, port: number): Promise<PortResolutionPlan> {
  return invoke<PortResolutionPlan>("create_port_resolution_plan", { pid, port });
}

export function executePortResolutionPlan(planId: string, confirmationToken: string): Promise<PortResolutionResult> {
  return invoke<PortResolutionResult>("execute_port_resolution_plan", { planId, confirmationToken });
}

export function inspectLocalServices(): Promise<LocalServiceStatus[]> {
  return invoke<LocalServiceStatus[]>("inspect_local_services");
}

export function stopLocalService(port: number, serviceName: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("stop_local_service", { port, serviceName, confirmationToken });
}

export function openProcessLocation(pid: number): Promise<OperationResult> {
  return invoke<OperationResult>("open_process_location", { pid });
}
