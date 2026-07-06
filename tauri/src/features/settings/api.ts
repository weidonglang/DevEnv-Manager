import type { SettingsWorkbenchSnapshot } from "./types";

export function loadSettingsWorkbench(): Promise<SettingsWorkbenchSnapshot> {
  return Promise.reject(new Error("Settings API is provided by the legacy bootstrap during this refactor."));
}
