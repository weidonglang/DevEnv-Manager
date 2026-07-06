import { escapeHtml, renderActionButton, renderBadge, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ReportsWorkbenchState } from "./state";

export function renderReportsWorkbench(state: ReportsWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.reports.label")}</h2><p>${t("feature.reports.description")}</p></div></div>
        ${renderFeatureGuide("reports")}
        <div class="metrics">${renderMetric(t("feature.reports.doctorScore"), valueOf(state.doctor, "score"))}${renderMetric(t("feature.reports.checks"), valueOf(state.doctor, "checks"))}${renderMetric(t("feature.reports.suggestions"), valueOf(state.doctor, "suggestions"))}</div>
        <div class="toolbar">
          ${renderActionButton("run-doctor-report", t("feature.reports.runDoctor"), "primary")}
          ${renderActionButton("export-doctor-markdown", t("feature.reports.exportMarkdown"))}
          ${renderActionButton("export-doctor-json", t("feature.reports.exportJson"))}
          ${renderActionButton("copy-report-summary", t("feature.reports.copySummary"))}
          ${renderActionButton("export-environment-report", t("feature.environment.export"))}
          ${renderActionButton("export-python-report", t("feature.reports.exportPython"))}
          ${renderActionButton("export-file-association-report", t("feature.reports.exportAssoc"))}
          ${renderActionButton("export-cleanup-report", t("feature.reports.exportCleanup"))}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.reports.doctorReport")}</h2>${state.doctor ? renderObjectTable(state.doctor, ["generatedAt", "score", "summary", "checks", "suggestions"]) : `<div class="empty">${t("feature.reports.noDoctor")}</div>`}</section>
      <section class="panel"><h2>${t("feature.reports.reportText")}</h2><pre>${escapeHtml(state.text)}</pre></section>
      <section class="panel">
        <h2>${t("feature.reports.coverage")}</h2>
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
      <section class="panel"><h2>${t("feature.reports.latestExport")}</h2><p>${escapeHtml(state.lastExport || t("feature.reports.noExport"))}</p></section>
    </div>
  `;
}

function renderReportCoverageRow(name: string, detail: string, status: "available" | "view"): string {
  return `<div class="data-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(detail)}</span><span>${renderBadge(status === "available" ? "Export" : "View", status === "available" ? "success" : "neutral")}</span></div>`;
}
