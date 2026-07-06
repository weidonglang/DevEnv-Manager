import type { DashboardSnapshot } from "./types";

export function renderDashboardSummary(snapshot: DashboardSnapshot): string {
  return `<section class="panel"><h2>Dashboard</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
