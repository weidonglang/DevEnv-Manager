import { escapeHtml, renderActionButton, renderMetric } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ProjectWorkbenchState } from "./state";
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
        <div data-testid="projects-result">${renderRows(vm.analysisRows, t("state.notChecked"))}</div>
      </section>
      <section class="panel"><h2>${t("feature.projects.recommendedRuntimes")}</h2>${renderRows(vm.recommendedRuntimeRows, t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.detectedActions")}</h2>${renderRows(vm.actionRows, t("state.notChecked"))}</section>
      <section class="panel" data-testid="projects-config-plan"><h2>${t("feature.projects.preview")}</h2>${state.preview ? `${renderRows(vm.previewRows)}${renderRows(vm.previewFileRows, t("state.notChecked"))}` : `<div class="empty">${escapeHtml(state.errors.preview || t("feature.projects.noPreview"))}</div>`}</section>
      <section class="panel" data-testid="projects-apply-result"><h2>${t("feature.projects.applyResult")}</h2>${state.errors.applyResult ? `<div class="error-state">${escapeHtml(state.errors.applyResult)}</div>` : ""}${state.applyResult ? renderRows([{ label: "success", value: String(state.applyResult.success) }, { label: "message", value: state.applyResult.message }]) : `<div class="empty">${t("state.notChecked")}</div>`}</section>
      <section class="panel"><h2>${t("feature.projects.projectPorts")}</h2>${renderRows(vm.portRows, state.errors.ports || t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.ideaInspectResult")}</h2>${renderRows(vm.ideaRows, state.errors.idea || t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.javaConsumerResult")}</h2>${renderRows(vm.javaConsumerRows, state.errors.javaConsumer || t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.agentTraces")}</h2>${renderRows(vm.traceRows, state.errors.traces || t("state.notChecked"))}</section>
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
