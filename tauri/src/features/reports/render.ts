import { escapeHtml, renderActionButton, renderBadge, renderMetric, renderObjectTable } from "../sharedView";
import { getActiveLocale, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ReportsWorkbenchState } from "./state";
import { toReportsViewModel } from "./viewModel";

export function renderReportsWorkbench(state: ReportsWorkbenchState): string {
  const vm = toReportsViewModel(state);
  return `
    <div class="feature-layout" data-testid="reports-page">
      <section class="panel" data-testid="reports-doctor-section">
        <div class="panel-head"><div><h2>${t("route.reports.label")}</h2><p>${t("feature.reports.description")}</p></div></div>
        ${renderFeatureGuide("reports")}
        <div class="metrics">
          ${renderMetric(t("feature.reports.doctorScore"), vm.doctorScore, vm.doctorScoreDetail)}
          ${renderMetric(t("feature.reports.checks"), vm.checks)}
          ${renderMetric(t("feature.reports.suggestions"), vm.suggestions)}
        </div>
        <div class="toolbar">
          ${renderActionButton("run-doctor-report", t("feature.reports.runDoctor"), "primary")}
          ${renderActionButton("export-doctor-markdown", t("feature.reports.exportMarkdown"))}
          ${renderActionButton("export-doctor-json", t("feature.reports.exportJson"))}
          ${renderActionButton("copy-report-summary", t("feature.reports.copySummary"))}
          ${renderActionButton("create-doctor-repair-plan", t("feature.reports.createDoctorPlan"))}
          ${renderActionButton("execute-doctor-repair-plan", t("feature.reports.executeDoctorPlan"), "danger")}
          ${renderActionButton("open-latest-report-location", t("feature.reports.openLatestExport"))}
          ${renderActionButton("export-environment-report", t("feature.environment.export"))}
          ${renderActionButton("export-python-report", t("feature.reports.exportPython"))}
          ${renderActionButton("export-file-association-report", t("feature.reports.exportAssoc"))}
          ${renderActionButton("export-cleanup-report", t("feature.reports.exportCleanup"))}
          ${renderActionButton("export-port-report", t("feature.reports.exportPort"))}
          ${renderActionButton("export-project-report", t("feature.reports.exportProject"))}
        </div>
      </section>
      <section class="panel" data-testid="reports-doctor-result">
        <h2>${t("feature.reports.doctorReport")}</h2>
        ${state.doctor ? `${renderRows(vm.doctorRows)}${renderRows(vm.checkRows, label("No checks.", "No checks."))}${renderRows(vm.suggestionRows, label("No suggestions.", "No suggestions."))}` : `<div class="empty">${t("feature.reports.noDoctor")}</div>`}
      </section>
      <section class="panel" data-testid="reports-repair-result"><h2>${t("feature.reports.doctorRepairPlan")}</h2>${renderDoctorRepair(state)}</section>
      <section class="panel" data-testid="reports-persistent-result"><h2>${t("feature.reports.reportText")}</h2><pre>${escapeHtml(vm.reportText)}</pre></section>
      <section class="panel" data-testid="reports-export-section">
        <h2>${t("feature.reports.coverage")}</h2>
        <div class="data-table">
          ${renderReportCoverageRow("Doctor report", "Markdown and JSON export", "available")}
          ${renderReportCoverageRow("Environment report", "Markdown export from the reliability snapshot", "available")}
          ${renderReportCoverageRow("Python diagnostic report", "Markdown export from the Python conflict analysis", "available")}
          ${renderReportCoverageRow("File association report", "JSON export from the association scanner", "available")}
          ${renderReportCoverageRow("Cleanup report", "Markdown or JSON export from cleanup scan data", "available")}
          ${renderReportCoverageRow("Port report", "JSON export with port scan, history, and local service status", "available")}
          ${renderReportCoverageRow("Project report", "JSON export with project analysis, config preview signals, ports, IDEA, and agent traces", "available")}
        </div>
      </section>
      <section class="panel" data-testid="reports-export-result">
        <h2>${t("feature.reports.latestExport")}</h2>
        <p>${escapeHtml(state.lastExport || t("feature.reports.noExport"))}</p>
        ${state.lastExportPath ? `<p><strong>${escapeHtml(state.lastExportPath)}</strong></p>` : ""}
      </section>
      <section class="panel" data-testid="reports-doctor-error"><h2>Error state</h2><div class="empty">${t("state.notChecked")}</div></section>
    </div>
  `;
}

function renderDoctorRepair(state: ReportsWorkbenchState): string {
  const plan = state.doctorPlan;
  const result = state.doctorRepairResult;
  return `${plan ? renderObjectTable(plan, ["planId", "beforeScore", "actions", "willCleanupPath", "willConfigureEnvironment", "backupName", "warnings"]) : `<div class="empty">${t("feature.reports.noDoctorPlan")}</div>`}${result ? renderObjectTable(result, ["beforeScore", "afterScore", "applied", "remaining"]) : ""}`;
}

function renderReportCoverageRow(name: string, detail: string, status: "available" | "view"): string {
  return `<div class="data-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(detail)}</span><span>${renderBadge(status === "available" ? "Export" : "View", status === "available" ? "success" : "neutral")}</span></div>`;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notChecked")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
