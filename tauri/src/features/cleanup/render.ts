import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { CleanupWorkbenchState } from "./state";

export function renderCleanupWorkbench(state: CleanupWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Cleanup</h2><p>Storage cleanup, archive, move, rollback, and partition expansion plans.</p></div></div>
        <div class="metrics">
          ${renderMetric("Scanned items", valueOf(state.scan, "totalItems", "0"))}
          ${renderMetric("Estimated bytes", valueOf(state.scan, "totalBytes", "0"))}
          ${renderMetric("Rollback records", state.rollbackRecords.length)}
          ${renderMetric("Selected", state.selectedIds.length)}
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-cleanup", "Scan cleanup targets", "primary")}
          ${renderActionButton("create-cleanup-plan", "Create cleanup plan")}
          ${renderActionButton("clear-download-cache", "Clear download cache", "danger")}
          ${renderActionButton("clean-dev-cache", "Clean dev cache", "danger")}
          ${renderActionButton("create-move-plan", "Create move plan")}
          ${renderActionButton("execute-move-plan", "Execute move plan", "danger")}
          ${renderActionButton("rollback-move", "Rollback move", "danger")}
          ${renderActionButton("create-expansion-plan", "C drive expansion plan")}
        </div>
      </section>
      <section class="panel"><h2>Cleanup report</h2>${state.scan ? renderObjectTable(state.scan, ["generatedAt", "totalItems", "totalBytes", "warnings"]) : `<div class="empty">No cleanup scan yet.</div>`}</section>
      <section class="panel"><h2>Plans</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "estimatedBytes", "requiresAdmin", "riskSummary", "warnings"]) : `<div class="empty">No cleanup plan.</div>`}${state.movePlan ? renderObjectTable(state.movePlan, ["planId", "source", "target", "mode", "warnings"]) : ""}</section>
    </div>
  `;
}
