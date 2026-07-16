import type { FeatureContext } from "../../app/featureContext";
import { bindAction, loadSafe } from "../sharedView";
import { getAppSnapshot, getEnvironmentHealth, getPortSummary, getPowerShellStatus, getUpdateStatus } from "./api";
import { renderDashboard } from "./render";
import type { DashboardState } from "./state";

export function bindDashboardEvents(context: FeatureContext, state: DashboardState): void {
  bindAction(context.root, "run-doctor", () => context.navigate("reports"));
  bindAction(context.root, "inspect-environment", () => context.navigate("environment"));
  bindAction(context.root, "scan-ports", () => context.navigate("ports"));
  bindAction(context.root, "retry-ports-only", async () => {
    const result = await loadSafe(() => getPortSummary());
    if (result.ok) {
      state.ports = result.value;
      state.portStatus = "cached";
      delete state.errors.ports;
    } else {
      state.portStatus = "unavailable";
      state.errors.ports = result.error;
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
  const [snapshot, health, powershell, update] = await Promise.all([
    loadSafe(getAppSnapshot),
    loadSafe(getEnvironmentHealth),
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
  state.portStatus = state.ports.length ? "cached" : "idle";
  state.loading = false;
  context.root.innerHTML = renderDashboard(state);
  bindDashboardEvents(context, state);
}
