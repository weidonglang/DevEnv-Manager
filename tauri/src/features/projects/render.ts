import { escapeHtml, renderActionButton, renderMetric } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ProjectOperationStatus, ProjectWorkbenchState } from "./state";
import { toProjectViewModel } from "./viewModel";

export function renderProjectWorkbench(state: ProjectWorkbenchState): string {
  const vm = toProjectViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel" data-testid="projects-analysis-section">
        <div class="panel-head"><div><h2>${t("route.projects.label")}</h2><p>${t("feature.projects.description")}</p></div></div>
        ${renderFeatureGuide("projects")}
        <div class="form-grid"><input id="project-path" value="${escapeHtml(state.selectedPath)}" readonly placeholder="${t("feature.projects.path")}" /></div>
        ${renderRecentProjects(state)}
        <div class="toolbar">
          ${renderActionButton("choose-project-dir", t("feature.projects.chooseDirectory"))}
          ${renderActionButton("analyze-project", t("feature.projects.analyze"), "primary")}
          ${renderActionButton("preview-project-config", t("feature.projects.previewConfig"))}
          ${renderActionButton("apply-project-config", t("feature.projects.applyConfig"), "danger")}
          ${renderActionButton("inspect-project-ports", t("feature.projects.inspectPorts"))}
          ${renderActionButton("update-project-port", t("feature.projects.updatePort"), "danger")}
          ${renderActionButton("inspect-idea-project", t("feature.projects.ideaInspect"))}
          ${renderActionButton("verify-java-consumer", t("feature.projects.javaVerify"))}
        </div>
      </section>
      <section class="panel">
        <h2>${t("feature.projects.health")}</h2>
        <div class="metrics">
          ${renderMetric(t("feature.projects.health"), vm.health, state.errors.analysis ?? "")}
          ${renderMetric(t("feature.projects.signals"), vm.signals)}
          ${renderMetric(t("feature.projects.portConfigs"), vm.ports, state.errors.ports ?? "")}
          ${renderMetric(t("feature.projects.agentTraces"), vm.traces, state.errors.traces ?? "")}
        </div>
        <div data-testid="projects-result" aria-live="polite">${renderOperationRows(vm.analysisRows, state.status.analysis, state.errors.analysis, localize("No project analysis has run.", "尚未分析项目。"), localize("Analysis completed without additional findings.", "分析已完成，未发现额外结果。"))}</div>
      </section>
      <section class="panel"><h2>${t("feature.projects.recommendedRuntimes")}</h2>${renderRows(vm.recommendedRuntimeRows, t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.detectedActions")}</h2>${renderRows(vm.actionRows, t("state.notChecked"))}</section>
      <section class="panel" data-testid="projects-config-plan" aria-live="polite"><h2>${t("feature.projects.preview")}</h2>${state.preview ? `${renderRows(vm.previewRows)}${renderRows(vm.previewFileRows, t("state.notChecked"))}` : renderOperationRows([], state.status.preview, state.errors.preview, t("feature.projects.noPreview"), localize("Preview completed, but no writable configuration files were proposed.", "预览已完成，但没有建议写入的配置文件。"))}</section>
      <section class="panel" data-testid="projects-apply-result" aria-live="polite"><h2>${t("feature.projects.applyResult")}</h2>${state.applyResult ? renderRows([{ label: localize("Success", "是否成功"), value: state.applyResult.success ? t("state.yes") : t("state.no") }, { label: localize("Message", "消息"), value: state.applyResult.message }]) : renderOperationRows([], state.status.applyResult, state.errors.applyResult, localize("No project configuration has been applied.", "尚未应用项目配置。"), localize("The operation completed without a receipt.", "操作已完成，但没有返回回执。"))}</section>
      <section class="panel" data-testid="projects-port-result" aria-live="polite"><h2>${t("feature.projects.projectPorts")}</h2>${renderOperationRows(vm.portRows, state.status.ports, state.errors.ports, localize("Project ports have not been inspected.", "尚未检查项目端口。"), localize("Inspection completed: no supported project port configuration was found.", "检查完成：未发现受支持的项目端口配置。"))}</section>
      <section class="panel" data-testid="projects-idea-result" aria-live="polite"><h2>${t("feature.projects.ideaInspectResult")}</h2>${renderOperationRows(vm.ideaRows, state.status.idea, state.errors.idea, localize("IDEA project has not been inspected.", "尚未检查 IDEA 项目。"), localize("IDEA inspection completed without findings.", "IDEA 检查完成，未发现结果。"))}</section>
      <section class="panel" data-testid="projects-java-consumer-result" aria-live="polite"><h2>${t("feature.projects.javaConsumerResult")}</h2>${renderOperationRows(vm.javaConsumerRows, state.status.javaConsumer, state.errors.javaConsumer, localize("Java consumer verification has not run.", "尚未验证 Java 消费端。"), localize("Java consumer verification completed without findings.", "Java 消费端验证完成，未发现结果。"))}</section>
      <section class="panel"><h2>${t("feature.projects.agentTraces")}</h2>${renderOperationRows(vm.traceRows, state.status.traces, state.errors.traces, t("state.notChecked"), localize("Inspection completed: no agent traces were found.", "检查完成：未发现 Agent 痕迹。"))}</section>
    </div>
  `;
}

function renderRecentProjects(state: ProjectWorkbenchState): string {
  if (!state.recentPaths.length) return "";
  return `<div class="toolbar compact">${state.recentPaths.map((path) => `<button type="button" data-recent-project="${escapeHtml(path)}" title="${escapeHtml(path)}">${escapeHtml(shortPath(path))}</button>`).join("")}</div>`;
}

function shortPath(path: string): string {
  const normalized = path.replace(/\//g, "\\");
  const parts = normalized.split("\\").filter(Boolean);
  return parts.slice(-2).join("\\") || normalized;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notAvailable")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function renderOperationRows(
  rows: Array<{ label: string; value: string }>,
  status: ProjectOperationStatus,
  error: string | undefined,
  idleText: string,
  emptyText: string,
): string {
  if (status === "loading") return `<div class="loading-state" role="status">${escapeHtml(localize("Working...", "正在处理..."))}</div>`;
  if (status === "failed") return `<div class="error-state" role="alert">${escapeHtml(error || localize("Operation failed.", "操作失败。"))}</div>`;
  if (rows.length) return renderRows(rows);
  if (status === "empty" || status === "success") return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="empty">${escapeHtml(idleText)}</div>`;
}
