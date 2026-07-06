import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { DashboardState } from "./state";

export function renderDashboard(state: DashboardState): string {
  return `
    <div class="feature-layout dashboard-view">
      <section class="panel">
        <div class="panel-head"><div><h2>Dashboard</h2><p>Snapshot, runtime health, ports, backups, runner, and update status.</p></div></div>
        ${renderHealthCards(state)}
        ${renderQuickActions()}
      </section>
      <section class="panel">
        <h2>Environment summary</h2>
        ${renderObjectTable(state.snapshot, ["rootDir", "devenvHome", "javaHome", "managedRuntimes", "tools"])}
      </section>
    </div>
  `;
}

export function renderHealthCards(state: DashboardState): string {
  return `<div class="metrics">
    ${renderMetric("Root directory", valueOf(state.snapshot, "rootDir"))}
    ${renderMetric("Discovered tools", valueOf(state.snapshot, "tools"))}
    ${renderMetric("Port records", state.ports.length)}
    ${renderMetric("PATH warnings", state.health.length)}
    ${renderMetric("JDK status", valueOf(state.snapshot, "javaHome"))}
    ${renderMetric("Python status", valueOf(state.snapshot, "python.version"))}
    ${renderMetric("PowerShell runner", valueOf(state.powershell, "status"))}
    ${renderMetric("Update status", valueOf(state.update, "latestVersion", "Not checked"))}
  </div>`;
}

export function renderQuickActions(): string {
  return `<div class="toolbar dashboard-actions">
    ${renderActionButton("run-doctor", "Run Doctor", "primary")}
    ${renderActionButton("inspect-environment", "Inspect Environment")}
    ${renderActionButton("scan-ports", "Scan Ports")}
    ${renderActionButton("search-file-association-app", "Search File Association App")}
    ${renderActionButton("create-java-stabilize-plan", "Create Java Stabilize Plan")}
    ${renderActionButton("check-updates", "Check Updates")}
    ${renderActionButton("export-report", "Export Report")}
  </div>`;
}
