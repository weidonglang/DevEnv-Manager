import { escapeHtml, renderActionButton, renderMetric } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ProjectWorkbenchState } from "./state";
import { toProjectViewModel } from "./viewModel";

export function renderProjectWorkbench(state: ProjectWorkbenchState): string {
  const vm = toProjectViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.projects.label")}</h2><p>${t("feature.projects.description")}</p></div></div>
        ${renderFeatureGuide("projects")}
        <div class="form-grid"><input id="project-path" value="${escapeHtml(state.selectedPath)}" placeholder="${t("feature.projects.path")}" /></div>
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
          ${renderMetric("Health", vm.health, state.errors.analysis ?? "")}
          ${renderMetric("Signals", vm.signals)}
          ${renderMetric("Port configs", vm.ports, state.errors.ports ?? "")}
          ${renderMetric("Agent traces", vm.traces, state.errors.traces ?? "")}
        </div>
        ${renderRows(vm.analysisRows, t("state.notChecked"))}
      </section>
      <section class="panel"><h2>Recommended runtimes</h2>${renderRows(vm.recommendedRuntimeRows, t("state.notChecked"))}</section>
      <section class="panel"><h2>Detected actions</h2>${renderRows(vm.actionRows, t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.projects.preview")}</h2>${state.preview ? `${renderRows(vm.previewRows)}${renderRows(vm.previewFileRows, t("state.notChecked"))}` : `<div class="empty">${escapeHtml(state.errors.preview || t("feature.projects.noPreview"))}</div>`}</section>
      <section class="panel"><h2>Project ports</h2>${renderRows(vm.portRows, state.errors.ports || t("state.notChecked"))}</section>
      <section class="panel"><h2>IDEA inspect result</h2>${renderRows(vm.ideaRows, state.errors.idea || t("state.notChecked"))}</section>
      <section class="panel"><h2>Java consumer result</h2>${renderRows(vm.javaConsumerRows, state.errors.javaConsumer || t("state.notChecked"))}</section>
      <section class="panel"><h2>Agent traces</h2>${renderRows(vm.traceRows, state.errors.traces || t("state.notChecked"))}</section>
    </div>
  `;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notAvailable")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}
