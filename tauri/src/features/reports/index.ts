export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindReportEvents } from "./events";
import { renderReportsWorkbench } from "./render";
import { reportsWorkbenchInitialState } from "./state";

export function mountReportsFeature(context: FeatureContext): void {
  const state = { ...reportsWorkbenchInitialState };
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
}
