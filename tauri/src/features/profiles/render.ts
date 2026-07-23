import { escapeHtml, pageItems, renderActionButton, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ProfilesState } from "./state";

export function renderProfilesWorkbench(state: ProfilesState): string {
  const page = pageItems(state.profiles, state.page, 10);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.profiles.label")}</h2><p>${t("feature.profiles.description")}</p></div></div>
        ${renderFeatureGuide("profiles")}
        <div class="metrics">${renderMetric(t("feature.profiles.profiles"), state.profiles.length)}${renderMetric(t("feature.profiles.selected"), state.selectedProfileId ?? t("feature.ports.none"))}${renderMetric(t("feature.profiles.plan"), valueOf(state.plan, "planId"))}</div>
        <div class="form-grid"><input id="profile-name" placeholder="${t("feature.profiles.newName")}" /><input id="profile-import-path" value="${escapeHtml(state.importPath)}" placeholder="${t("feature.profiles.importPath")}" /></div>
        <div class="toolbar">
          ${renderActionButton("refresh-profiles", t("feature.profiles.list"), "primary")}
          ${renderActionButton("save-profile", t("feature.profiles.save"))}
          ${renderActionButton("rename-profile", t("feature.profiles.rename"))}
          ${renderActionButton("copy-profile", t("feature.profiles.copy"))}
          ${renderActionButton("create-profile-plan", t("feature.profiles.createPlan"))}
          ${renderActionButton("execute-profile-plan", t("feature.profiles.executePlan"), "danger")}
          ${renderActionButton("choose-profile-import", t("feature.profiles.chooseImportFile"))}
          ${renderActionButton("preview-profile-import", t("feature.profiles.previewImport"))}
          ${renderActionButton("import-profiles", t("feature.profiles.import"), "danger")}
          ${renderActionButton("export-profiles", t("feature.profiles.export"))}
          ${renderActionButton("delete-profile", t("feature.profiles.delete"))}
        </div>
      </section>
      <section class="panel" data-testid="profiles-list"><h2>${t("feature.profiles.profiles")}</h2><div class="data-table">${page.items.map((profile) => `<button class="data-row" data-profile-id="${escapeHtml(profile.id)}"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.path)}</span><span>${escapeHtml(profile.createdAt)}</span></button>`).join("") || `<div class="empty">${t("feature.profiles.empty")}</div>`}</div>${renderPagination("profiles", page.page, page.totalPages, page.total)}</section>
      <section class="panel" data-testid="profiles-result"><h2>${t("feature.profiles.applyPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["profileName", "profileId", "runtimeSwitches", "missingRequirements", "willInstall", "willWriteEnvironment", "backupName", "warnings", "planId"]) : `<div class="empty">${t("feature.profiles.noApplyPlan")}</div>`}${renderOperationResult(state)}</section>
      <section class="panel"><h2>${t("feature.profiles.importPreview")}</h2>${state.importPreview ? renderObjectTable(state.importPreview, ["source", "exportedAt", "profiles"]) : `<div class="empty">${t("feature.profiles.noImportPreview")}</div>`}${state.importResult ? `<p>${escapeHtml(state.importResult)}</p>` : ""}</section>
      <section class="panel" data-testid="profiles-history-section">
        <div class="panel-head"><div><h2>${localize("Profile history", "配置档案历史")}</h2><p>${localize("Every profile mutation keeps the previous complete collection. Review a snapshot before restoring it.", "每次修改配置档案前都会保存完整旧状态；恢复前必须先预览计划。")}</p></div></div>
        <div class="toolbar">
          ${renderActionButton("refresh-profile-history", localize("Refresh history", "刷新历史"))}
          ${renderActionButton("create-profile-history-restore-plan", localize("Create restore plan", "创建恢复计划"), "primary")}
          ${renderActionButton("execute-profile-history-restore-plan", localize("Execute restore", "执行恢复"), "danger")}
        </div>
        <div class="data-table" data-testid="profiles-history-list">
          ${state.history.map((entry) => `<button class="data-row ${entry.id === state.selectedHistoryId ? "is-selected" : ""}" data-profile-history-id="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.createdAt)}</span><span>${escapeHtml(entry.reason)}</span><span>${entry.profileCount}</span></button>`).join("") || `<div class="empty">${localize("No profile history yet.", "尚无配置档案历史。")}</div>`}
        </div>
        <div data-testid="profiles-history-restore-plan">
          ${state.historyPlan ? renderObjectTable(state.historyPlan, ["planId", "historyId", "snapshotCreatedAt", "snapshotReason", "profileCount", "backupHistoryId", "riskLevel", "planFingerprint", "warnings"]) : `<div class="empty">${localize("No restore plan.", "尚未创建恢复计划。")}</div>`}
        </div>
        <div data-testid="profiles-history-restore-result">
          ${state.historyResult ? renderObjectTable(state.historyResult, ["success", "message", "restoredHistoryId", "backupHistoryId", "restoredProfileCount"]) : `<div class="empty">${localize("No restore has been executed.", "尚未执行历史恢复。")}</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderOperationResult(state: ProfilesState): string {
  return `<div data-testid="profiles-operation-result">
    ${state.operationError ? `<div class="error-state">${escapeHtml(state.operationError)}</div>` : ""}
    ${state.operationResult ? `<div class="small-note">${escapeHtml(state.operationResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}
  </div>`;
}
