import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { ToolchainWorkbenchState } from "./state";

export function renderToolchainWorkbench(state: ToolchainWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Toolchains</h2><p>Git, Node, Python, platform tools, local services, chsrc, and MySQL repair.</p></div></div>
        <div class="metrics">
          ${renderMetric("Toolchain report", valueOf(state.report, "generatedAt"))}
          ${renderMetric("Local services", state.services.length)}
          ${renderMetric("System platforms", valueOf(state.system, "items"))}
          ${renderMetric("MySQL candidates", valueOf(state.mysql, "candidates"))}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-toolchains", "Inspect Toolchains", "primary")}
          ${renderActionButton("inspect-platforms", "Inspect Platform Toolchains")}
          ${renderActionButton("inspect-services", "Inspect Local Services")}
          ${renderActionButton("manage-local-service", "Manage Local Service", "danger")}
          ${renderActionButton("manage-system-platform", "Manage System Platform", "danger")}
          ${renderActionButton("inspect-mysql", "Inspect MySQL Repair")}
          ${renderActionButton("create-mysql-plan", "Create MySQL Repair Plan")}
          ${renderActionButton("execute-mysql-plan", "Execute MySQL Repair Plan", "danger")}
        </div>
      </section>
      <section class="panel"><h2>Toolchain detail</h2>${renderObjectTable(state.report, ["git.git.status", "node.npmRegistry", "python.pipIndexUrl", "generatedAt"])}</section>
      <section class="panel"><h2>MySQL repair</h2>${state.mysqlPlan ? renderObjectTable(state.mysqlPlan, ["planId", "candidateId", "action", "riskLevel", "warnings"]) : renderObjectTable(state.mysql, ["generatedAt", "candidates", "conclusion"])}</section>
    </div>
  `;
}
