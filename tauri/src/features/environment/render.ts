import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { EnvironmentWorkbenchState } from "./state";

export function renderEnvironmentWorkbench(state: EnvironmentWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Environment</h2><p>Java reliability, PATH quality, backups, and repair plans.</p></div></div>
        <div class="metrics">
          ${renderMetric("JAVA_HOME raw", valueOf(state.reliability, "javaHomeRaw"))}
          ${renderMetric("JAVA_HOME expanded", valueOf(state.reliability, "javaHomeExpanded"))}
          ${renderMetric("PATH warnings", state.health.length)}
          ${renderMetric("Backups", state.envBackups.length + state.environmentBackups.length)}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-environment", "Inspect Environment", "primary")}
          ${renderActionButton("create-java-plan", "Create Java Stabilize Plan")}
          ${renderActionButton("apply-java-plan", "Apply Env Repair Plan", "danger")}
          ${renderActionButton("cleanup-path", "Cleanup PATH", "danger")}
          ${renderActionButton("export-environment-report", "Export Environment Report")}
        </div>
      </section>
      <section class="panel"><h2>Reliability details</h2>${renderObjectTable(state.reliability, ["javaHomeRaw", "javaHomeExpanded", "pathFirstJava", "pathFirstJavac", "pathFirstJar", "processJavaHome", "registryJavaHome"])}</section>
      <section class="panel"><h2>Repair plan</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "backupName", "summary", "warnings"]) : `<div class="empty">No repair plan created.</div>`}</section>
    </div>
  `;
}
