export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindSettingsEvents, refreshSettings } from "./events";
import { renderSettingsWorkbench } from "./render";
import { settingsWorkbenchInitialState } from "./state";

export async function mountSettingsFeature(context: FeatureContext): Promise<void> {
  const state = { ...settingsWorkbenchInitialState };
  context.root.innerHTML = renderSettingsWorkbench(state);
  bindSettingsEvents(context, state);
  await refreshSettings(context, state);
}
