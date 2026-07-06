export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindProjectEvents } from "./events";
import { renderProjectWorkbench } from "./render";
import { projectWorkbenchInitialState } from "./state";

export function mountProjectsFeature(context: FeatureContext): void {
  const state = { ...projectWorkbenchInitialState };
  context.root.innerHTML = renderProjectWorkbench(state);
  bindProjectEvents(context, state);
}
