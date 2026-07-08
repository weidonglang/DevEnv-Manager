import { escapeHtml, pageItems, renderActionButton, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
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
        <div class="form-grid"><input id="profile-name" placeholder="${t("feature.profiles.newName")}" /><input id="profile-import-path" placeholder="${t("feature.profiles.importPath")}" /></div>
        <div class="toolbar">
          ${renderActionButton("refresh-profiles", t("feature.profiles.list"), "primary")}
          ${renderActionButton("save-profile", t("feature.profiles.save"))}
          ${renderActionButton("create-profile-plan", t("feature.profiles.createPlan"))}
          ${renderActionButton("execute-profile-plan", t("feature.profiles.executePlan"), "danger")}
          ${renderActionButton("preview-profile-import", t("feature.profiles.previewImport"))}
          ${renderActionButton("export-profiles", t("feature.profiles.export"))}
          ${renderActionButton("delete-profile", t("feature.profiles.delete"))}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.profiles.profiles")}</h2><div class="data-table">${page.items.map((profile) => `<button class="data-row" data-profile-id="${escapeHtml(profile.id)}"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.path)}</span><span>${escapeHtml(profile.createdAt)}</span></button>`).join("") || `<div class="empty">${t("feature.profiles.empty")}</div>`}</div>${renderPagination("profiles", page.page, page.totalPages, page.total)}</section>
      <section class="panel"><h2>${t("feature.profiles.applyPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["profileName", "profileId", "runtimeSwitches", "missingRequirements", "willInstall", "willWriteEnvironment", "backupName", "warnings", "planId"]) : `<div class="empty">${t("feature.profiles.noApplyPlan")}</div>`}</section>
    </div>
  `;
}
