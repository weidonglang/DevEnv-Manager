import { escapeHtml, pageItems, renderActionButton, renderMetric, renderPagination } from "../sharedView";
import { getLocaleMode, localeModeLabel, t, type LocaleMode } from "../../core/i18n";
import { debugEntriesAsMarkdown, getDebugEntries, isAdvancedMode, type DebugEventStatus, type DebugEventType, type DebugLogEntry } from "../../core/debugLog";
import { renderFeatureGuide, renderRiskLevelGuide } from "../../components/featureGuide";
import type { SettingsWorkbenchState } from "./state";
import { toSettingsViewModel } from "./viewModel";

export function renderSettingsWorkbench(state: SettingsWorkbenchState): string {
  const vm = toSettingsViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("settings.title")}</h2><p>${t("settings.description")}</p></div></div>
        ${renderFeatureGuide("settings")}
        <div class="metrics">${renderMetric(t("settings.root"), vm.rootDir, state.errors.config ?? "")}${renderMetric(t("settings.autoUpdates"), vm.autoUpdate)}${renderMetric(t("settings.theme"), vm.theme)}${renderMetric(t("settings.language"), vm.language)}${renderMetric(t("settings.powershell"), vm.powershell, vm.powershellDetail)}</div>
        <div class="form-grid"><input id="settings-root" value="${escapeHtml(vm.rootInput)}" placeholder="${t("settings.rootDirectory")}" /></div>
        <div class="segmented">
          ${(["light", "dark", "system", "high-contrast"] as const).map((mode) => `<button data-theme-mode="${mode}" class="${state.theme === mode ? "active" : ""}" type="button">${mode}</button>`).join("")}
        </div>
        <div class="segmented" aria-label="${t("settings.language")}">
          ${(["auto", "zh-CN", "en-US"] as LocaleMode[]).map((mode) => `<button data-locale-mode="${mode}" class="${getLocaleMode() === mode ? "active" : ""}" type="button">${localeModeLabel(mode)}</button>`).join("")}
        </div>
        <div class="toolbar">
          ${renderActionButton("save-root-dir", t("settings.saveRoot"), "primary")}
          ${renderActionButton("toggle-auto-update", t("settings.toggleAutoUpdate"))}
          ${renderActionButton("check-update", t("dashboard.checkUpdates"))}
          ${renderActionButton("open-config-dir", t("settings.openConfigDir"))}
          ${renderActionButton("show-safety-notice", t("settings.viewSafetyNotice"))}
          ${renderActionButton("toggle-advanced-mode", isAdvancedMode() ? t("settings.advancedOff") : t("settings.advancedOn"))}
          ${renderActionButton("reset-ui-config", t("settings.resetUiConfig"), "danger")}
        </div>
      </section>
      ${renderRiskLevelGuide()}
      <section class="panel" data-testid="settings-operation-result"><h2>操作结果</h2>${state.operationError ? `<div class="error-state">${escapeHtml(state.operationError)}</div>` : ""}${state.operationResult ? `<div class="small-note">${escapeHtml(state.operationResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}</section>
      <section class="panel"><h2>${t("settings.updateSource")}</h2>${renderRows(vm.updateRows)}</section>
      <section class="panel"><h2>${t("settings.powershellRunner")}</h2>${renderRows(vm.powershellRows)}</section>
      ${isAdvancedMode() ? renderDebugPanel(state.debugPage) : ""}
    </div>
  `;
}

function renderRows(rows: Array<{ label: string; value: string }>): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("")}</dl>`;
}

function renderDebugPanel(page: number): string {
  const entries = filterDebugEntries(getDebugEntries(), {});
  const paged = pageItems(entries, page, 40);
  return `<section class="panel" id="debug-panel">
    <div class="panel-head"><div><h2>${t("settings.debugPanel")}</h2><p>${t("settings.debugPanelDetail")}</p></div></div>
    <div class="debug-filter-grid">
      <label>${t("settings.debugFilterType")}<select id="debug-filter-type">${renderDebugTypeOptions()}</select></label>
      <label>${t("settings.debugFilterStatus")}<select id="debug-filter-status">${renderDebugStatusOptions()}</select></label>
      <label class="checkbox-row"><input id="debug-filter-current-view" type="checkbox" />${t("settings.debugFilterCurrentView")}</label>
      <label>${t("settings.debugSearch")}<input id="debug-search" type="search" placeholder="${t("settings.debugSearchPlaceholder")}" /></label>
    </div>
    <div class="toolbar">
      ${renderActionButton("refresh-debug-log", t("settings.debugRefresh"))}
      ${renderActionButton("copy-debug-log", t("settings.debugCopy"))}
      ${renderActionButton("export-debug-markdown", t("settings.debugExportMarkdown"))}
      ${renderActionButton("export-debug-json", t("settings.debugExportJson"))}
      ${renderActionButton("clear-debug-log", t("settings.debugClear"), "danger")}
    </div>
    <pre class="debug-log-preview" id="debug-log-preview">${renderDebugEntriesPreview(paged.items)}</pre>
    <div id="debug-pagination">${renderPagination("debug-log", paged.page, paged.totalPages, paged.total)}</div>
  </section>`;
}

export type DebugFilter = {
  type?: string;
  status?: string;
  currentView?: string;
  search?: string;
};

export function filterDebugEntries(entries: DebugLogEntry[], filter: DebugFilter): DebugLogEntry[] {
  const query = (filter.search ?? "").trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.type && entry.type !== filter.type) return false;
    if (filter.status && entry.status !== filter.status) return false;
    if (filter.currentView && entry.view !== filter.currentView) return false;
    if (!query) return true;
    const haystack = [
      entry.type,
      entry.status,
      entry.name,
      entry.view ?? "",
      entry.detail ?? "",
      entry.elapsedMs?.toString() ?? "",
      debugSearchText(entry.data),
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function renderDebugEntriesPreview(entries: DebugLogEntry[]): string {
  return escapeHtml(debugEntriesAsMarkdown(entries));
}

function renderDebugTypeOptions(): string {
  const types: Array<"" | DebugEventType> = ["", "navigation", "click", "input", "change", "search", "filter", "sort", "pagination", "invoke", "risk", "token", "toast", "progress", "error", "export"];
  return types.map((type) => `<option value="${type}">${type || t("settings.debugFilterAll")}</option>`).join("");
}

function renderDebugStatusOptions(): string {
  const statuses: Array<"" | DebugEventStatus> = ["", "started", "success", "failed", "timeout", "cancelled", "staleIgnored", "info"];
  return statuses.map((status) => `<option value="${status}">${status || t("settings.debugFilterAll")}</option>`).join("");
}

function debugSearchText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.slice(0, 20).map(debugSearchText).join(" ");
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 30)
    .map(([key, child]) => `${key} ${debugSearchText(child)}`)
    .join(" ");
}
