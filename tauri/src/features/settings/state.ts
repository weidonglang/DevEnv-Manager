import type { SettingsWorkbenchSnapshot } from "./types";

export type SettingsWorkbenchState = {
  snapshot: SettingsWorkbenchSnapshot | null;
};

export const settingsWorkbenchInitialState: SettingsWorkbenchState = {
  snapshot: null,
};
