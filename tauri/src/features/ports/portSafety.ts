import type { PortRecord } from "../../types";

export type PortTreatabilityReasonKey =
  | "feature.ports.noSelectedDetail"
  | "feature.ports.noPidReason"
  | "feature.ports.protectedOwnerReason"
  | "feature.ports.serviceOwnedReason"
  | "feature.ports.systemProcessReason"
  | "feature.ports.criticalOwnerReason"
  | "feature.ports.treatableReason";

export type PortTreatability = {
  treatable: boolean;
  reasonKey: PortTreatabilityReasonKey;
};

const SYSTEM_PROCESS_NAMES = new Set(["system", "idle", "registry", "svchost.exe", "services.exe", "lsass.exe", "wininit.exe", "csrss.exe", "smss.exe"]);

export function portRecordKey(record: PortRecord): string {
  return `${record.protocol}:${record.localPort}:${record.pid}`;
}

export function assessPortTreatability(record: PortRecord | null | undefined): PortTreatability {
  if (!record) return { treatable: false, reasonKey: "feature.ports.noSelectedDetail" };
  const processName = (record.processName || "").trim().toLowerCase();
  const identity = `${record.identity || ""} ${record.riskLevel || ""} ${record.risk || ""}`.toLowerCase();
  if (!record.pid) return { treatable: false, reasonKey: "feature.ports.noPidReason" };
  if (record.pid <= 4 || processName === "system") return { treatable: false, reasonKey: "feature.ports.protectedOwnerReason" };
  if (record.serviceNames.length) return { treatable: false, reasonKey: "feature.ports.serviceOwnedReason" };
  if (SYSTEM_PROCESS_NAMES.has(processName)) return { treatable: false, reasonKey: "feature.ports.systemProcessReason" };
  if (identity.includes("critical") || identity.includes("system")) return { treatable: false, reasonKey: "feature.ports.criticalOwnerReason" };
  return { treatable: true, reasonKey: "feature.ports.treatableReason" };
}

export function selectedPortRecord(records: PortRecord[], selectedKey: string | null): PortRecord | null {
  if (!selectedKey) return null;
  return records.find((record) => portRecordKey(record) === selectedKey) ?? null;
}
