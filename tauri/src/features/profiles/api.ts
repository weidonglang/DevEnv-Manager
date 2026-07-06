import type { ProfileWorkbenchState } from "./types";

export function loadProfiles(): Promise<ProfileWorkbenchState> {
  return Promise.reject(new Error("Profile API is provided by the legacy bootstrap during this refactor."));
}
