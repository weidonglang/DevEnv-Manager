import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { ReportsWorkbenchState } from "./state";

export function renderReportsWorkbench(state: ReportsWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Reports</h2><p>Doctor, environment, Python, file association, port, cleanup, and project reports.</p></div></div>
        <div class="metrics">${renderMetric("Doctor score", valueOf(state.doctor, "score"))}${renderMetric("Checks", valueOf(state.doctor, "checks"))}${renderMetric("Suggestions", valueOf(state.doctor, "suggestions"))}</div>
        <div class="toolbar">
          ${renderActionButton("run-doctor-report", "Run Doctor", "primary")}
          ${renderActionButton("export-doctor-markdown", "Export Markdown")}
          ${renderActionButton("export-doctor-json", "Export JSON")}
          ${renderActionButton("copy-report-summary", "Copy report summary")}
          ${renderActionButton("export-environment-report", "Export Environment Report")}
          ${renderActionButton("export-file-association-report", "Export File Association Report")}
          ${renderActionButton("export-cleanup-report", "Export Cleanup Report")}
        </div>
      </section>
      <section class="panel"><h2>Doctor report</h2>${state.doctor ? renderObjectTable(state.doctor, ["generatedAt", "score", "summary", "checks", "suggestions"]) : `<div class="empty">No doctor report yet.</div>`}</section>
      <section class="panel"><h2>Report text</h2><pre>${escapeHtml(state.text)}</pre></section>
    </div>
  `;
}
