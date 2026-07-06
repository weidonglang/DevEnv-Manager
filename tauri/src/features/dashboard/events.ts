import type { FeatureContext } from "../../app/featureContext";
import { bindAction } from "../sharedView";
import { getAppSnapshot, getEffectiveRuntimeSummary, getUpdateStatus } from "./api";
import { renderDashboard } from "./render";
import type { DashboardState } from "./state";

export function bindDashboardEvents(context: FeatureContext, state: DashboardState): void {
  bindAction(context.root, "run-doctor", () => context.navigate("reports"));
  bindAction(context.root, "inspect-environment", () => context.navigate("environment"));
  bindAction(context.root, "scan-ports", () => context.navigate("ports"));
  bindAction(context.root, "search-file-association-app", () => context.navigate("fileAssociations"));
  bindAction(context.root, "create-java-stabilize-plan", () => context.navigate("environment"));
  bindAction(context.root, "check-updates", async () => {
    state.update = await getUpdateStatus();
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
  const [snapshot, summary, update] = await Promise.all([getAppSnapshot(), getEffectiveRuntimeSummary(), getUpdateStatus()]);
  state.snapshot = snapshot;
  state.health = summary.health;
  state.ports = summary.ports;
  state.powershell = summary.powershell;
  state.update = update;
  state.loading = false;
  context.root.innerHTML = renderDashboard(state);
  bindDashboardEvents(context, state);
}
