export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindFileAssociationEvents, refreshFileAssociations } from "./events";
import { renderFileAssociations } from "./render";
import { fileAssociationInitialState } from "./state";

export async function mountFileAssociationsFeature(context: FeatureContext): Promise<void> {
  const state = { ...fileAssociationInitialState, selectedExtensions: new Set<string>() };
  context.root.innerHTML = renderFileAssociations(state);
  bindFileAssociationEvents(context, state);
  await refreshFileAssociations(context, state);
}
