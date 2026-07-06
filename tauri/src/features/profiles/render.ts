import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { ProfilesState } from "./state";

export function renderProfilesWorkbench(state: ProfilesState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Profiles</h2><p>Save, inspect, plan, apply, import, export, and delete configuration profiles.</p></div></div>
        <div class="metrics">${renderMetric("Profiles", state.profiles.length)}${renderMetric("Selected", state.selectedProfileId ?? "None")}${renderMetric("Plan", valueOf(state.plan, "planId"))}</div>
        <div class="form-grid"><input id="profile-name" placeholder="New profile name" /><input id="profile-import-path" placeholder="Import file path" /></div>
        <div class="toolbar">
          ${renderActionButton("refresh-profiles", "List profiles", "primary")}
          ${renderActionButton("save-profile", "Save current profile")}
          ${renderActionButton("create-profile-plan", "Create profile apply plan")}
          ${renderActionButton("execute-profile-plan", "Execute profile apply plan", "danger")}
          ${renderActionButton("preview-profile-import", "Preview profile import")}
          ${renderActionButton("export-profiles", "Export profiles")}
          ${renderActionButton("delete-profile", "Delete profile")}
        </div>
      </section>
      <section class="panel"><h2>Profiles</h2><div class="data-table">${state.profiles.map((profile) => `<button class="data-row" data-profile-id="${escapeHtml(profile.id)}"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.path)}</span><span>${escapeHtml(profile.createdAt)}</span></button>`).join("") || `<div class="empty">No profiles saved.</div>`}</div></section>
      <section class="panel"><h2>Profile apply plan</h2>${state.plan ? renderObjectTable(state.plan, ["profileName", "profileId", "runtimeSwitches", "missingRequirements", "willInstall", "willWriteEnvironment", "backupName", "warnings", "planId"]) : `<div class="empty">No apply plan.</div>`}</section>
    </div>
  `;
}
