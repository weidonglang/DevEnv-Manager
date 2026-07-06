export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindRuntimeEvents, refreshRuntimes } from "./events";
import { renderRuntimeWorkbench } from "./render";
import { runtimeWorkbenchInitialState } from "./state";

export async function mountRuntimesFeature(context: FeatureContext): Promise<void> {
  const state = { ...runtimeWorkbenchInitialState };
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
  await refreshRuntimes(context, state);
}
