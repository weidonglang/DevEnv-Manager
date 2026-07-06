export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindDashboardEvents, refreshDashboard } from "./events";
import { renderDashboard } from "./render";
import { dashboardInitialState } from "./state";

export async function mountDashboardFeature(context: FeatureContext): Promise<void> {
  const state = { ...dashboardInitialState };
  context.root.innerHTML = renderDashboard(state);
  bindDashboardEvents(context, state);
  await refreshDashboard(context, state);
}
