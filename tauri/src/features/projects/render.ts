import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ProjectWorkbenchState } from "./state";

export function renderProjectWorkbench(state: ProjectWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.projects.label")}</h2><p>${t("feature.projects.description")}</p></div></div>
        ${renderFeatureGuide("projects")}
        <div class="form-grid"><input id="project-path" value="${escapeHtml(state.selectedPath)}" placeholder="${t("feature.projects.path")}" /></div>
        <div class="toolbar">
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
          ${renderMetric("Health", valueOf(state.analysis, "health"))}
          ${renderMetric("Signals", valueOf(state.analysis, "signals"))}
          ${renderMetric("Port configs", state.ports.length)}
          ${renderMetric("Agent traces", valueOf(state.traces, "items"))}
        </div>
        ${renderObjectTable(state.analysis, ["path", "projectType", "jdkRequirement", "recommendedJdk", "framework"])}
      </section>
      <section class="panel"><h2>${t("feature.projects.preview")}</h2>${state.preview ? renderObjectTable(state.preview, ["previewId", "summary", "backupName", "files"]) : `<div class="empty">${t("feature.projects.noPreview")}</div>`}</section>
    </div>
  `;
}
