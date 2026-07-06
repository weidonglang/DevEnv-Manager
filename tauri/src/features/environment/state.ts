import type { EnvironmentWorkbenchSnapshot } from "./types";

export type EnvironmentWorkbenchState = {
  snapshot: EnvironmentWorkbenchSnapshot | null;
};

export const environmentWorkbenchInitialState: EnvironmentWorkbenchState = {
  snapshot: null,
};
