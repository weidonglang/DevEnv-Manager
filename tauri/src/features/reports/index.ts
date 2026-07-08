export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindReportEvents } from "./events";
import { renderReportsWorkbench } from "./render";
import { reportsWorkbenchInitialState, type ReportsWorkbenchState } from "./state";

const persistedReportsState: ReportsWorkbenchState = { ...reportsWorkbenchInitialState };

export function mountReportsFeature(context: FeatureContext): void {
  context.root.innerHTML = renderReportsWorkbench(persistedReportsState);
  bindReportEvents(context, persistedReportsState);
}
