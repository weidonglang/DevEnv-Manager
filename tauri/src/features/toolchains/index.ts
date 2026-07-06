export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindToolchainEvents, refreshToolchains } from "./events";
import { renderToolchainWorkbench } from "./render";
import { toolchainWorkbenchInitialState } from "./state";

export async function mountToolchainsFeature(context: FeatureContext): Promise<void> {
  const state = { ...toolchainWorkbenchInitialState };
  context.root.innerHTML = renderToolchainWorkbench(state);
  bindToolchainEvents(context, state);
  await refreshToolchains(context, state);
}
