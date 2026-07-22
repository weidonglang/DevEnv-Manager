import type { FeatureContext } from "../../app/featureContext";
import { bindAction, loadSafe } from "../sharedView";
import { enrichPortScan, forcePortScan, getAppSnapshot, getEnvironmentHealth, getPortScanStatus, getPowerShellStatus, getUpdateStatus } from "./api";
import { renderDashboard } from "./render";
import type { DashboardState } from "./state";
import type { PortScanSnapshot } from "../../types";
import { localize } from "../../core/i18n";

let activePortUpdate: ((snapshot: PortScanSnapshot) => void) | null = null;
let portUpdateListenerBound = false;

export function bindDashboardEvents(context: FeatureContext, state: DashboardState): void {
  activePortUpdate = (snapshot) => {
    if (!context.isCurrent()) return;
    applyPortSnapshot(state, snapshot);
    context.root.innerHTML = renderDashboard(state);
    bindDashboardEvents(context, state);
  };
  if (!portUpdateListenerBound) {
    portUpdateListenerBound = true;
    window.addEventListener("devenv:port-scan-updated", (event) => {
      activePortUpdate?.((event as CustomEvent<PortScanSnapshot>).detail);
    });
  }
  bindAction(context.root, "run-doctor", () => context.navigate("reports"));
  bindAction(context.root, "inspect-environment", () => context.navigate("environment"));
  bindAction(context.root, "scan-ports", () => context.navigate("ports"));
  bindAction(context.root, "retry-ports-only", async () => {
    state.portStatus = "scanning";
    context.root.innerHTML = renderDashboard(state);
    bindDashboardEvents(context, state);
    const result = await loadSafe(() => forcePortScan());
    if (result.ok) {
      applyPortSnapshot(state, result.value);
      if (result.value.scanId && !result.value.complete && result.value.status !== "failed") {
        void enrichPortScan(result.value.scanId)
          .then((snapshot) => {
            if (!context.isCurrent()) return;
            applyPortSnapshot(state, snapshot);
            context.root.innerHTML = renderDashboard(state);
            bindDashboardEvents(context, state);
          })
          .catch(() => undefined);
      }
    } else {
      state.portStatus = "unavailable";
      state.errors.ports = "Port scanning failed; retry or export diagnostics.";
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderDashboard(state);
    bindDashboardEvents(context, state);
  });
  bindAction(context.root, "search-file-association-app", () => context.navigate("fileAssociations"));
  bindAction(context.root, "create-java-stabilize-plan", () => context.navigate("environment"));
  bindAction(context.root, "check-updates", async () => {
    state.update = await getUpdateStatus();
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderDashboard(state);
    bindDashboardEvents(context, state);
  });
  bindAction(context.root, "export-report", () => context.navigate("reports"));
  context.root.querySelector("[data-dashboard-refresh]")?.addEventListener("click", () => {
    void refreshDashboard(context, state);
  });
}

export async function refreshDashboard(context: FeatureContext, state: DashboardState): Promise<void> {
  state.loading = true;
  state.errors = {};
  const [snapshot, health, ports, powershell, update] = await Promise.all([
    loadSafe(getAppSnapshot),
    loadSafe(getEnvironmentHealth),
    loadSafe(getPortScanStatus),
    loadSafe(getPowerShellStatus),
    loadSafe(getUpdateStatus),
  ]);
  if (!context.isCurrent()) return;
  if (snapshot.ok) {
    state.snapshot = snapshot.value;
  } else {
    state.errors.snapshot = snapshot.error;
  }
  if (health.ok) {
    state.health = health.value;
  } else {
    state.errors.health = health.error;
  }
  if (ports.ok) {
    applyPortSnapshot(state, ports.value);
  } else {
    state.portStatus = state.ports.length ? "stale" : "unavailable";
    state.errors.ports = "Port scan status is temporarily unavailable.";
  }
  if (powershell.ok) {
    state.powershell = powershell.value;
  } else {
    state.errors.powershell = powershell.error;
  }
  if (update.ok) {
    state.update = update.value;
  } else {
    state.errors.update = update.error;
  }
  state.loading = false;
  context.root.innerHTML = renderDashboard(state);
  bindDashboardEvents(context, state);
}

function applyPortSnapshot(state: DashboardState, snapshot: NonNullable<DashboardState["portSnapshot"]>): void {
  state.portSnapshot = snapshot;
  if (snapshot.records.length || snapshot.status !== "failed") state.ports = snapshot.records;
  state.portStatus = snapshot.status === "scanning"
    ? "scanning"
    : snapshot.status === "stale"
      ? "stale"
      : snapshot.status === "failed"
        ? (state.ports.length ? "stale" : "unavailable")
        : snapshot.status === "idle"
          ? "idle"
          : "cached";
  if (snapshot.status === "failed") {
    state.errors.ports = localize(
      "Port scanning timed out or failed. Retry or export diagnostics.",
      "端口扫描超时或失败，可以重试或导出诊断。",
    );
  } else if (snapshot.status === "stale") {
    state.errors.ports = localize(
      "Port scanning failed; the last successful result is retained.",
      "端口扫描失败，已保留上次成功结果。",
    );
  }
  else delete state.errors.ports;
}
