import type { EnvironmentWorkbenchSnapshot } from "./types";

export function renderEnvironmentWorkbench(snapshot: EnvironmentWorkbenchSnapshot): string {
  return `<section class="panel"><h2>Environment</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
