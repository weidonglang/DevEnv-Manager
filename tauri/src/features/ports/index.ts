import type { PortRecord } from "../../types";

export function canShowKillPortAction(record: PortRecord) {
  const name = (record.processName || "").toLowerCase();
  const identity = `${record.identity} ${record.riskLevel} ${record.risk}`.toLowerCase();
  if (!record.pid || record.pid <= 4) return false;
  if (["system", "idle", "registry", "svchost.exe", "services.exe", "lsass.exe", "wininit.exe", "csrss.exe", "smss.exe"].includes(name)) return false;
  if (identity.includes("system") || identity.includes("系统关键") || identity.includes("critical")) return false;
  return true;
}
