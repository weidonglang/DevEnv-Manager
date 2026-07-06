import type { ProfileWorkbenchState } from "./types";

export function renderProfilesWorkbench(state: ProfileWorkbenchState): string {
  return `<section class="panel"><h2>Profiles</h2><pre>${JSON.stringify(state, null, 2)}</pre></section>`;
}
