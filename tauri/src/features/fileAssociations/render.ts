import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { FileAssociationUiState } from "./state";

export function renderFileAssociations(state: FileAssociationUiState): string {
  const records = state.report?.records ?? [];
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
          <input id="assoc-extension" placeholder=".txt" value="${escapeHtml([...state.selectedExtensions][0] ?? "")}" />
          <input id="assoc-app" placeholder="${t("feature.fileAssociations.appName")}" value="${escapeHtml(state.targetAppName)}" />
          <input id="assoc-exe" placeholder="${t("feature.fileAssociations.exePath")}" value="${escapeHtml(state.targetExecutable)}" />
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-associations", t("feature.fileAssociations.scan"), "primary")}
          ${renderActionButton("search-association-app", t("feature.fileAssociations.search"))}
          ${renderActionButton("create-association-plan", t("feature.fileAssociations.createPlan"))}
          ${renderActionButton("apply-association-plan", t("feature.fileAssociations.applyPlan"), "danger")}
          ${renderActionButton("rollback-association-backup", t("feature.fileAssociations.rollback"), "danger")}
          ${renderActionButton("open-default-apps", t("feature.fileAssociations.defaultApps"))}
          ${renderActionButton("export-association-report", t("feature.fileAssociations.export"))}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.fileAssociations.candidates")}</h2>${state.appSearch ? renderObjectTable(state.appSearch, ["query", "extension", "bestCandidate.appName", "bestCandidate.exePath", "bestCandidate.confidence", "bestCandidate.matchReason", "bestCandidate.source"]) : `<div class="empty">${t("feature.fileAssociations.searchEmpty")}</div>`}</section>
      <section class="panel"><h2>${t("feature.fileAssociations.records")}</h2><div class="data-table">${records.slice(0, 40).map((record) => `<div class="data-row"><span>${escapeHtml(valueOf(record, "extension"))}</span><span>${escapeHtml(valueOf(record, "currentAppName"))}</span><span>${escapeHtml(valueOf(record, "risk"))}</span><span>${escapeHtml(valueOf(record, "source"))}</span></div>`).join("") || `<div class="empty">${t("feature.fileAssociations.noResults")}</div>`}</div></section>
      <section class="panel"><h2>${t("feature.fileAssociations.plan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "mode", "backupName", "warnings", "changes"]) : `<div class="empty">${t("feature.fileAssociations.noPlan")}</div>`}</section>
    </div>
  `;
}
