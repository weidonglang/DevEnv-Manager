import type { ProjectWorkbenchSnapshot } from "./types";

export function renderProjectWorkbench(snapshot: ProjectWorkbenchSnapshot): string {
  return `<section class="panel"><h2>Projects</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
