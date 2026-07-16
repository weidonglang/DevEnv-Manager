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
        ${state.doctor ? `${renderRows(vm.doctorRows)}${renderRows(vm.checkRows, label("No checks.", "无检查项。"))}${renderRows(vm.suggestionRows, label("No suggestions.", "无建议。"))}` : `<div class="empty">${t("feature.reports.noDoctor")}</div>`}
      </section>
      <section class="panel" data-testid="reports-repair-result"><h2>${t("feature.reports.doctorRepairPlan")}</h2>${renderDoctorRepair(state)}</section>
      <section class="panel" data-testid="reports-persistent-result"><h2>${t("feature.reports.reportText")}</h2><pre>${escapeHtml(vm.reportText)}</pre></section>
      <section class="panel" data-testid="reports-export-section">
        <h2>${t("feature.reports.coverage")}</h2>
        <div class="data-table">
          ${renderReportCoverageRow(label("Doctor report", "环境医生报告"), label("Markdown and JSON export", "导出 Markdown 和 JSON"), "available")}
          ${renderReportCoverageRow(label("Environment report", "环境报告"), label("Markdown export from the reliability snapshot", "从可靠性快照导出 Markdown"), "available")}
          ${renderReportCoverageRow(label("Python diagnostic report", "Python 诊断报告"), label("Markdown export from the Python conflict analysis", "从 Python 冲突分析导出 Markdown"), "available")}
          ${renderReportCoverageRow(label("File association report", "文件关联报告"), label("JSON export from the association scanner", "从文件关联扫描器导出 JSON"), "available")}
          ${renderReportCoverageRow(label("Cleanup report", "清理报告"), label("Markdown or JSON export from cleanup scan data", "从清理扫描数据导出 Markdown 或 JSON"), "available")}
          ${renderReportCoverageRow(label("Port report", "端口报告"), label("JSON export with port scan, history, and local service status", "导出包含端口扫描、历史和本地服务状态的 JSON"), "available")}
          ${renderReportCoverageRow(label("Project report", "项目报告"), label("JSON export with project analysis, config preview signals, ports, IDEA, and agent traces", "导出包含项目分析、配置预览信号、端口、IDEA 和代理轨迹的 JSON"), "available")}
        </div>
      </section>
      <section class="panel" data-testid="reports-export-result">
        <h2>${t("feature.reports.latestExport")}</h2>
        ${state.actionError ? `<div class="error-state">${escapeHtml(state.actionError)}</div>` : ""}
        ${state.actionResult ? `<div class="small-note" data-testid="reports-action-result">${escapeHtml(state.actionResult)}</div>` : ""}
        <p>${escapeHtml(state.lastExport || t("feature.reports.noExport"))}</p>
        ${state.lastExportPath ? `<p><strong>${escapeHtml(state.lastExportPath)}</strong></p>` : ""}
      </section>
      <section class="panel" data-testid="reports-doctor-error"><h2>${label("Error state", "错误状态")}</h2><div class="empty">${t("state.notChecked")}</div></section>
    </div>
  `;
}

function renderDoctorRepair(state: ReportsWorkbenchState): string {
  const plan = state.doctorPlan;
  const result = state.doctorRepairResult;
  return `<div data-testid="reports-doctor-plan-state">
    ${renderObjectTable({ status: state.doctorPlanStatus, updatedAt: state.doctorPlanUpdatedAt || t("state.notChecked") }, ["status", "updatedAt"])}
    ${state.doctorPlanStatus === "creating" ? `<div class="loading-state" role="status">${t("feature.reports.creatingDoctorPlan")}</div>` : ""}
    ${state.actionError ? `<div class="error-state" data-testid="reports-doctor-plan-error">${escapeHtml(state.actionError)}</div>` : ""}
    ${plan ? `${renderObjectTable(plan, ["planId", "beforeScore", "actions", "willCleanupPath", "willConfigureEnvironment", "backupName", "warnings"])}${renderDoctorActionDetails(plan.actionDetails)}` : state.doctorPlanStatus === "empty" ? `<div class="empty">${label("Doctor completed: no supported repair actions are required.", "环境医生已完成：当前不需要受支持的修复操作。")}</div>` : state.doctorPlanStatus === "expired" ? `<div class="empty">${label("The plan expired or became stale. Run Doctor and create a new plan.", "计划已过期或失效，请重新运行环境医生并创建计划。")}</div>` : state.doctorPlanStatus === "executed" ? `<div class="empty">${label("The single-use plan was executed. The result is shown below.", "一次性计划已执行，结果显示在下方。")}</div>` : state.doctorPlanStatus === "failed" ? `<div class="empty">${label("Plan creation or execution failed. Review the persistent error above.", "计划创建或执行失败，请查看上方持久错误。")}</div>` : state.doctorPlanStatus === "creating" ? "" : `<div class="empty">${t("feature.reports.noDoctorPlan")}</div>`}
    ${result ? renderObjectTable(result, ["beforeScore", "afterScore", "applied", "remaining"]) : ""}
  </div>`;
}

function renderDoctorActionDetails(actions: NonNullable<ReportsWorkbenchState["doctorPlan"]>["actionDetails"]): string {
  if (!actions.length) return "";
  return `<div class="table-wrap"><table data-testid="reports-doctor-plan-actions"><thead><tr><th>${label("Action", "操作")}</th><th>${label("Reason", "原因")}</th><th>${label("Evidence", "证据")}</th><th>${label("Risk", "风险")}</th><th>${label("Backup", "备份")}</th><th>${label("Token", "令牌")}</th><th>${label("Next step", "下一步")}</th></tr></thead><tbody>${actions.map((action) => `<tr><td>${escapeHtml(action.title)}<br><small>${escapeHtml(action.actionId)}</small></td><td>${escapeHtml(action.reason)}</td><td>${escapeHtml(action.evidence.join("; "))}</td><td>${escapeHtml(action.riskLevel)}</td><td>${action.requiresBackup ? t("state.yes") : t("state.no")}</td><td>${action.requiresToken ? t("state.yes") : t("state.no")}</td><td>${escapeHtml(action.nextStep)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderReportCoverageRow(name: string, detail: string, status: "available" | "view"): string {
  return `<div class="data-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(detail)}</span><span>${renderBadge(status === "available" ? label("Export", "导出") : label("View", "查看"), status === "available" ? "success" : "neutral")}</span></div>`;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notChecked")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
