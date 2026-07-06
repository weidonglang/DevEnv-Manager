export function fileDirectory(path: string, directory?: string) {
  return directory || path.replace(/[\\/][^\\/]*$/, "");
}

export * from "./api";
export * from "./events";
export * from "./render";
export * from "./state";
export * from "./types";
import type { FeatureContext } from "../../app/featureContext";
import { bindCleanupEvents, refreshCleanup } from "./events";
import { renderCleanupWorkbench } from "./render";
import { cleanupWorkbenchInitialState } from "./state";

export async function mountCleanupFeature(context: FeatureContext): Promise<void> {
  const state = { ...cleanupWorkbenchInitialState };
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
  await refreshCleanup(context, state);
}
