import { invoke } from "../../core/invoke";
import type { LocalServiceStatus, OperationResult, PortHistorySummary, PortResolutionPlan, PortResolutionResult, PortScanSnapshot } from "../../types";

export function scanPorts(force = false, scope: "recommended" | "full" = "recommended"): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("scan_ports", { force, scope });
}

export function enrichPortScan(scanId: string): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("enrich_port_scan", { scanId });
}

export function portScanStatus(): Promise<PortScanSnapshot> {
  return invoke<PortScanSnapshot>("port_scan_status");
}

export function cancelPortScan(): Promise<OperationResult> {
  return invoke<OperationResult>("cancel_port_scan");
}

export function portHistory(): Promise<PortHistorySummary[]> {
  return invoke<PortHistorySummary[]>("port_history");
}

export function createPortResolutionPlan(groupId: string): Promise<PortResolutionPlan> {
  return invoke<PortResolutionPlan>("create_port_resolution_plan", { groupId });
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
