import type { RuntimeWorkbenchSnapshot } from "./types";

export function renderRuntimeWorkbench(snapshot: RuntimeWorkbenchSnapshot): string {
  return `<section class="panel"><h2>Runtimes</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
