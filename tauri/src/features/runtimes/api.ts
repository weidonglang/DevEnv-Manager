import type { RuntimeWorkbenchSnapshot } from "./types";

export function loadRuntimeWorkbench(): Promise<RuntimeWorkbenchSnapshot> {
  return Promise.reject(new Error("Runtime API is provided by the legacy bootstrap during this refactor."));
}
