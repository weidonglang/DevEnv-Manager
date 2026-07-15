import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { FileAssociationUiState } from "./state";

export function renderFileAssociations(state: FileAssociationUiState): string {
  const records = filteredRecords(state);
  const appliedBackupId = state.applyResult?.backupId;
  const rollbackBackup = state.backups.find((item) => item.backupId === appliedBackupId) ?? state.backups[0];
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.fileAssociations.label")}</h2><p>${t("feature.fileAssociations.description")}</p></div></div>
        ${renderFeatureGuide("fileAssociations")}
        <div class="metrics">
          ${renderMetric(t("feature.fileAssociations.extensions"), valueOf(state.report, "totalExtensions", records.length))}
          ${renderMetric(t("feature.fileAssociations.manageable"), valueOf(state.report, "manageableExtensions"))}
          ${renderMetric(t("feature.fileAssociations.missingApps"), valueOf(state.report, "missingAppCount"))}
          ${renderMetric(t("feature.fileAssociations.backups"), state.backups.length)}
        </div>
        <div class="form-grid">
          <input id="assoc-filter" data-testid="file-associations-search-input" placeholder="${t("feature.fileAssociations.filterExtension")}" value="${escapeHtml(state.filter.keyword)}" />
          <input id="assoc-extension" placeholder=".txt" value="${escapeHtml([...state.selectedExtensions][0] ?? "")}" />
          <input id="assoc-app" placeholder="${t("feature.fileAssociations.appName")}" value="${escapeHtml(state.targetAppName)}" />
          <input id="assoc-exe" placeholder="${t("feature.fileAssociations.exePath")}" value="${escapeHtml(state.targetExecutable)}" />
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-associations", t("feature.fileAssociations.scan"), "primary")}
          ${renderActionButton("choose-association-exe", t("feature.fileAssociations.chooseExe"))}
          ${renderActionButton("search-association-app", t("feature.fileAssociations.search"))}
          ${renderActionButton("create-association-plan", t("feature.fileAssociations.createPlan"))}
          ${renderActionButton("apply-association-plan", t("feature.fileAssociations.applyPlan"), "danger")}
          ${renderActionButton("rollback-association-backup", t("feature.fileAssociations.rollback"), "danger")}
          ${renderActionButton("open-default-apps", t("feature.fileAssociations.defaultApps"))}
          ${renderActionButton("export-association-report", t("feature.fileAssociations.export"))}
        </div>
      </section>
      <section class="panel" data-testid="file-associations-app-search-result"><h2>${t("feature.fileAssociations.candidates")}</h2>${renderAppSearchState(state)}</section>
      <section class="panel"><h2>${t("feature.fileAssociations.records")}</h2><div class="data-table" data-testid="file-associations-records-table">${records.slice(0, 40).map((record) => `<div class="data-row"><span>${escapeHtml(valueOf(record, "extension"))}</span><span>${escapeHtml(valueOf(record, "currentAppName"))}</span><span>${escapeHtml(valueOf(record, "risk"))}</span><span>${escapeHtml(valueOf(record, "source"))}</span><span><button data-assoc-extension="${escapeHtml(valueOf(record, "extension"))}" data-assoc-app="${escapeHtml(valueOf(record, "currentAppName", ""))}" type="button">${t("feature.fileAssociations.changeOpenWith")}</button></span></div>`).join("") || `<div class="empty">${t("feature.fileAssociations.noResults")}</div>`}</div></section>
      <section class="panel"><h2>${t("feature.fileAssociations.plan")}</h2>${state.selectionResult ? `<div class="small-note" data-testid="file-associations-selection-result">${escapeHtml(state.selectionResult)}</div>` : ""}<div data-testid="file-associations-plan-preview">${state.plan ? renderAssociationPlan(state.plan) : `<div class="empty">${t("feature.fileAssociations.noPlan")}</div>`}</div><div data-testid="file-associations-rollback-info">${rollbackBackup ? renderObjectTable(rollbackBackup, ["backupId", "createdAt", "backupPath", "extensions", "rollbackAvailable"]) : `<div class="empty">${t("toast.noBackupAvailable")}</div>`}</div>${renderAssociationResults(state)}</section>
    </div>
  `;
}

function renderAssociationPlan(plan: NonNullable<FileAssociationUiState["plan"]>): string {
  return `<div class="association-plan-detail">
    ${renderObjectTable({
      planId: plan.planId,
      riskLevel: plan.riskLevel,
      targetAppName: plan.targetAppName,
      targetExecutable: plan.targetExecutable,
      backupPath: plan.backupPath,
      requiresConfirmationToken: plan.requiresConfirmationToken,
      planFingerprint: plan.planFingerprint,
    }, ["planId", "riskLevel", "targetAppName", "targetExecutable", "backupPath", "requiresConfirmationToken", "planFingerprint"])}
    <div class="table-wrap"><table data-testid="file-associations-plan-changes-table"><thead><tr>
      <th>Extension</th><th>Current default application</th><th>Current ProgID</th><th>Target application</th><th>Target executable</th><th>Modification location</th><th>UserChoice state</th><th>Risk</th><th>Rollback</th><th>Windows Settings confirmation</th><th>Warnings</th>
    </tr></thead><tbody>${plan.changes.map((change) => `<tr>
      <td>${escapeHtml(change.extension)}</td>
      <td>${escapeHtml(change.before.currentAppName || t("state.notAvailable"))}</td>
      <td>${escapeHtml(change.before.currentProgId || t("state.notAvailable"))}</td>
      <td>${escapeHtml(change.after.appName)}</td>
      <td>${escapeHtml(change.after.executable)}</td>
      <td>${escapeHtml(associationModificationLocation(change.extension, change.applyMode))}</td>
      <td>${escapeHtml(change.before.source === "userChoice" ? "UserChoice present" : `Source: ${change.before.source}`)}</td>
      <td>${escapeHtml(change.risk)}</td>
      <td>${escapeHtml(plan.backupPath ? `Available: ${plan.backupPath}` : "Not available")}</td>
      <td>${change.applyMode === "openSystemSettings" || change.before.requiresSystemSettings ? t("state.yes") : t("state.no")}</td>
      <td>${escapeHtml(change.warnings.join("; ") || t("state.notAvailable"))}</td>
    </tr>`).join("")}</tbody></table></div>
  </div>`;
}

function renderAssociationResults(state: FileAssociationUiState): string {
  const result = state.rollbackResult ?? state.applyResult;
  return `<div data-testid="file-associations-operation-result">
    ${state.operationError ? `<div class="error-state" data-testid="file-associations-operation-error">${escapeHtml(state.operationError)}</div>` : ""}
    ${result ? `<div class="execution-result ${result.success ? "ok" : "warn"}">
      <div class="metrics">
        ${renderMetric("Status", result.success ? t("state.yes") : t("state.no"))}
        ${renderMetric("Items", result.items.length)}
        ${renderMetric("Backup", result.backupId || result.backupPath || t("state.notAvailable"))}
      </div>
      ${renderObjectTable(result, ["message", "backupId", "backupPath"])}
      <div class="table-wrap"><table><thead><tr><th>Extension</th><th>Success</th><th>UserChoice</th><th>Message</th></tr></thead><tbody>${result.items.map((item) => `<tr><td>${escapeHtml(item.extension)}</td><td>${item.success ? t("state.yes") : t("state.no")}</td><td>${item.requiresSystemSettings ? t("state.yes") : t("state.no")}</td><td>${escapeHtml(item.message)}</td></tr>`).join("")}</tbody></table></div>
    </div>` : `<div class="empty">${state.applyResultMessage ? escapeHtml(state.applyResultMessage) : t("state.notChecked")}</div>`}
  </div>`;
}

function renderAppCandidates(state: FileAssociationUiState): string {
  const search = state.appSearch;
  if (!search) return "";
  const candidates = search.candidates ?? [];
  return `<div>
    ${renderObjectTable(search, ["query", "normalizedQuery", "matchedDisplayName", "manualSelectionRequired", "message"])}
    <div class="data-table">${candidates.map((candidate) => `<button class="data-row" type="button" data-assoc-candidate-app="${escapeHtml(candidate.displayName)}" data-assoc-candidate-exe="${escapeHtml(candidate.executablePath)}"><span>${escapeHtml(candidate.displayName)}</span><span>${escapeHtml(candidate.executablePath)}</span><span>${escapeHtml(candidate.source)}</span><span>${escapeHtml(candidate.confidence)}</span></button>`).join("") || `<div class="empty">${t("feature.fileAssociations.searchEmpty")}</div>`}</div>
  </div>`;
}

function renderAppSearchState(state: FileAssociationUiState): string {
  if (state.appSearchStatus === "loading") {
    return `<div class="loading-state" role="status" data-testid="file-associations-app-search-loading">${t("feature.fileAssociations.search")}</div>`;
  }
  if (state.appSearchStatus === "failed") {
    return `<div class="error-state" data-testid="file-associations-app-search-error">${escapeHtml(state.appSearchError || state.operationError)}</div>`;
  }
  if (state.appSearchStatus === "empty") {
    return `<div data-testid="file-associations-app-search-empty">${state.appSearch ? renderAppCandidates(state) : `<div class="empty">${t("feature.fileAssociations.searchEmpty")}</div>`}</div>`;
  }
  if (state.appSearchStatus === "results" && state.appSearch) return renderAppCandidates(state);
  return `<div class="empty">${t("feature.fileAssociations.searchEmpty")}</div>`;
}

function associationModificationLocation(extension: string, applyMode: string): string {
  if (applyMode === "openSystemSettings") return "Windows Settings > Apps > Default apps";
  if (applyMode === "blocked") return "Blocked - no registry write";
  return `HKCU\\Software\\Classes\\${extension} and target ProgID command`;
}

function filteredRecords(state: FileAssociationUiState): unknown[] {
  const query = state.filter.keyword.trim().toLowerCase();
  const records = state.report?.records ?? [];
  if (!query) return records;
  return records.filter((record) => `${valueOf(record, "extension")} ${valueOf(record, "currentAppName")} ${valueOf(record, "source")}`.toLowerCase().includes(query));
}
