import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { FileAssociationUiState } from "./state";

export function renderFileAssociations(state: FileAssociationUiState): string {
  const records = state.report?.records ?? [];
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>File Associations</h2><p>Scan, search apps, create plans, apply changes, and rollback backups.</p></div></div>
        <div class="metrics">
          ${renderMetric("Extensions", valueOf(state.report, "totalExtensions", records.length))}
          ${renderMetric("Manageable", valueOf(state.report, "manageableExtensions"))}
          ${renderMetric("Missing apps", valueOf(state.report, "missingAppCount"))}
          ${renderMetric("Backups", state.backups.length)}
        </div>
        <div class="form-grid">
          <input id="assoc-extension" placeholder=".txt" value="${escapeHtml([...state.selectedExtensions][0] ?? "")}" />
          <input id="assoc-app" placeholder="App name" value="${escapeHtml(state.targetAppName)}" />
          <input id="assoc-exe" placeholder="Executable path" value="${escapeHtml(state.targetExecutable)}" />
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-associations", "Scan Associations", "primary")}
          ${renderActionButton("search-association-app", "Search App")}
          ${renderActionButton("create-association-plan", "Create Plan")}
          ${renderActionButton("apply-association-plan", "Apply Plan", "danger")}
          ${renderActionButton("rollback-association-backup", "Rollback Backup", "danger")}
          ${renderActionButton("open-default-apps", "Default Apps Settings")}
          ${renderActionButton("export-association-report", "Export Report")}
        </div>
      </section>
      <section class="panel"><h2>App candidates</h2>${state.appSearch ? renderObjectTable(state.appSearch, ["query", "extension", "bestCandidate.appName", "bestCandidate.exePath", "bestCandidate.confidence", "bestCandidate.matchReason", "bestCandidate.source"]) : `<div class="empty">Search an app to see candidates.</div>`}</section>
      <section class="panel"><h2>Association records</h2><div class="data-table">${records.slice(0, 40).map((record) => `<div class="data-row"><span>${escapeHtml(valueOf(record, "extension"))}</span><span>${escapeHtml(valueOf(record, "currentAppName"))}</span><span>${escapeHtml(valueOf(record, "risk"))}</span><span>${escapeHtml(valueOf(record, "source"))}</span></div>`).join("") || `<div class="empty">No scan results.</div>`}</div></section>
      <section class="panel"><h2>Plan</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "mode", "backupName", "warnings", "changes"]) : `<div class="empty">No plan created.</div>`}</section>
    </div>
  `;
}
