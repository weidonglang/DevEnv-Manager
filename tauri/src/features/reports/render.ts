import type { ReportWorkbenchSnapshot } from "./types";

export function renderReportsWorkbench(snapshot: ReportWorkbenchSnapshot): string {
  return `<section class="panel"><h2>Reports</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
