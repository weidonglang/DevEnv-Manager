export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindEnvironmentEvents, refreshEnvironment } from "./events";
import { renderEnvironmentWorkbench } from "./render";
import { environmentWorkbenchInitialState } from "./state";

export async function mountEnvironmentFeature(context: FeatureContext): Promise<void> {
  const state = { ...environmentWorkbenchInitialState };
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
  await refreshEnvironment(context, state);
}
