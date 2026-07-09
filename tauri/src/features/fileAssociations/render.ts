import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { FileAssociationUiState } from "./state";

export function renderFileAssociations(state: FileAssociationUiState): string {
  const records = filteredRecords(state);
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
      <section class="panel"><h2>${t("feature.fileAssociations.candidates")}</h2>${state.appSearch ? renderAppCandidates(state) : `<div class="empty">${t("feature.fileAssociations.searchEmpty")}</div>`}</section>
      <section class="panel"><h2>${t("feature.fileAssociations.records")}</h2><div class="data-table" data-testid="file-associations-records-table">${records.slice(0, 40).map((record) => `<div class="data-row"><span>${escapeHtml(valueOf(record, "extension"))}</span><span>${escapeHtml(valueOf(record, "currentAppName"))}</span><span>${escapeHtml(valueOf(record, "risk"))}</span><span>${escapeHtml(valueOf(record, "source"))}</span><span><button data-assoc-extension="${escapeHtml(valueOf(record, "extension"))}" data-assoc-app="${escapeHtml(valueOf(record, "currentAppName", ""))}" type="button">${t("feature.fileAssociations.changeOpenWith")}</button></span></div>`).join("") || `<div class="empty">${t("feature.fileAssociations.noResults")}</div>`}</div></section>
      <section class="panel"><h2>${t("feature.fileAssociations.plan")}</h2><div data-testid="file-associations-plan-preview">${state.plan ? renderObjectTable(state.plan, ["planId", "targetAppName", "targetExecutable", "backupPath", "warnings", "changes"]) : `<div class="empty">${t("feature.fileAssociations.noPlan")}</div>`}</div><div data-testid="file-associations-rollback-info">${state.backups.length ? renderObjectTable(state.backups[0], ["backupName", "createdAt", "path"]) : `<div class="empty">${t("toast.noBackupAvailable")}</div>`}</div>${state.applyResultMessage ? `<p>${escapeHtml(state.applyResultMessage)}</p>` : ""}</section>
    </div>
  `;
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

function filteredRecords(state: FileAssociationUiState): unknown[] {
  const query = state.filter.keyword.trim().toLowerCase();
  const records = state.report?.records ?? [];
  if (!query) return records;
  return records.filter((record) => `${valueOf(record, "extension")} ${valueOf(record, "currentAppName")} ${valueOf(record, "source")}`.toLowerCase().includes(query));
}
