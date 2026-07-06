import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { ProjectWorkbenchState } from "./state";

export function renderProjectWorkbench(state: ProjectWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Projects</h2><p>Analyze project health, runtime needs, ports, and editor configuration.</p></div></div>
        <div class="form-grid"><input id="project-path" value="${escapeHtml(state.selectedPath)}" placeholder="Project path" /></div>
        <div class="toolbar">
          ${renderActionButton("analyze-project", "Analyze Project", "primary")}
          ${renderActionButton("preview-project-config", "Preview Project Configuration")}
          ${renderActionButton("apply-project-config", "Apply Project Configuration", "danger")}
          ${renderActionButton("inspect-project-ports", "Inspect Project Port Configs")}
          ${renderActionButton("update-project-port", "Update Project Port", "danger")}
          ${renderActionButton("inspect-idea-project", "IDEA Project Inspect")}
          ${renderActionButton("verify-java-consumer", "Java Consumer Verify")}
        </div>
      </section>
      <section class="panel">
        <h2>Project health</h2>
        <div class="metrics">
          ${renderMetric("Health", valueOf(state.analysis, "health"))}
          ${renderMetric("Signals", valueOf(state.analysis, "signals"))}
          ${renderMetric("Port configs", state.ports.length)}
          ${renderMetric("Agent traces", valueOf(state.traces, "items"))}
        </div>
        ${renderObjectTable(state.analysis, ["path", "projectType", "jdkRequirement", "recommendedJdk", "framework"])}
      </section>
      <section class="panel"><h2>Configuration preview</h2>${state.preview ? renderObjectTable(state.preview, ["previewId", "summary", "backupName", "files"]) : `<div class="empty">No preview created.</div>`}</section>
    </div>
  `;
}
