import type { EnvironmentWorkbenchSnapshot } from "./types";

export function loadEnvironmentWorkbench(): Promise<EnvironmentWorkbenchSnapshot> {
  return Promise.reject(new Error("Environment API is provided by the legacy bootstrap during this refactor."));
}
