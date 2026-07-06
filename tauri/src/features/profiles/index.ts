export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindProfileEvents, refreshProfiles } from "./events";
import { renderProfilesWorkbench } from "./render";
import { profilesInitialState } from "./state";

export async function mountProfilesFeature(context: FeatureContext): Promise<void> {
  const state = { ...profilesInitialState };
  context.root.innerHTML = renderProfilesWorkbench(state);
  bindProfileEvents(context, state);
  await refreshProfiles(context, state);
}
