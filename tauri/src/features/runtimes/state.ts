import type { RuntimeWorkbenchSnapshot } from "./types";

export type RuntimeWorkbenchState = {
  snapshot: RuntimeWorkbenchSnapshot | null;
  selectedRuntimeId: string | null;
};

export const runtimeWorkbenchInitialState: RuntimeWorkbenchState = {
  snapshot: null,
  selectedRuntimeId: null,
};
