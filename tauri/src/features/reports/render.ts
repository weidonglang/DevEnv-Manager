import { escapeHtml, renderActionButton, renderBadge, renderMetric, renderObjectTable, valueOf } from "../sharedView";
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
          ${renderActionButton("export-python-report", "Export Python Diagnostic Report")}
          ${renderActionButton("export-file-association-report", "Export File Association Report")}
          ${renderActionButton("export-cleanup-report", "Export Cleanup Report")}
        </div>
      </section>
      <section class="panel"><h2>Doctor report</h2>${state.doctor ? renderObjectTable(state.doctor, ["generatedAt", "score", "summary", "checks", "suggestions"]) : `<div class="empty">No doctor report yet.</div>`}</section>
      <section class="panel"><h2>Report text</h2><pre>${escapeHtml(state.text)}</pre></section>
      <section class="panel">
        <h2>Report coverage</h2>
        <div class="data-table">
          ${renderReportCoverageRow("Doctor report", "Markdown and JSON export", "available")}
          ${renderReportCoverageRow("Environment report", "Markdown export from the reliability snapshot", "available")}
          ${renderReportCoverageRow("Python diagnostic report", "Markdown export from the Python conflict analysis", "available")}
          ${renderReportCoverageRow("File association report", "JSON export from the association scanner", "available")}
          ${renderReportCoverageRow("Cleanup report", "Markdown or JSON export from cleanup scan data", "available")}
          ${renderReportCoverageRow("Port report", "Available in Ports & Services through scan, filter, plan, and result views", "view")}
          ${renderReportCoverageRow("Project report", "Available in Projects through analysis, configuration preview, and port inspection", "view")}
        </div>
      </section>
      <section class="panel"><h2>Latest export</h2><p>${escapeHtml(state.lastExport || "No export in this session.")}</p></section>
    </div>
  `;
}

function renderReportCoverageRow(name: string, detail: string, status: "available" | "view"): string {
  return `<div class="data-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(detail)}</span><span>${renderBadge(status === "available" ? "Export" : "View", status === "available" ? "success" : "neutral")}</span></div>`;
}
