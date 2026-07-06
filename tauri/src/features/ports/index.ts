import type { PortRecord } from "../../types";

export function canShowKillPortAction(record: PortRecord) {
  const name = (record.processName || "").toLowerCase();
  const identity = `${record.identity} ${record.riskLevel} ${record.risk}`.toLowerCase();
  if (!record.pid || record.pid <= 4) return false;
  if (["system", "idle", "registry", "svchost.exe", "services.exe", "lsass.exe", "wininit.exe", "csrss.exe", "smss.exe"].includes(name)) return false;
  if (identity.includes("system") || identity.includes("系统关键") || identity.includes("critical")) return false;
  return true;
}

export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindPortEvents, refreshPorts } from "./events";
import { renderPortsWorkbench } from "./render";
import { portsWorkbenchInitialState } from "./state";

export async function mountPortsFeature(context: FeatureContext): Promise<void> {
  const state = { ...portsWorkbenchInitialState };
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);
  await refreshPorts(context, state);
}
