import { escapeHtml, pageItems, renderActionButton, renderMetric, renderPagination } from "../sharedView";
import { getLocaleMode, localize, localeModeLabel, t, type LocaleMode } from "../../core/i18n";
import { debugEntriesAsMarkdown, getDebugEntries, isAdvancedMode, type DebugEventStatus, type DebugEventType, type DebugLogEntry } from "../../core/debugLog";
import { renderFeatureGuide, renderRiskLevelGuide } from "../../components/featureGuide";
import type { SettingsWorkbenchState } from "./state";
import { toSettingsViewModel } from "./viewModel";

export function renderSettingsWorkbench(state: SettingsWorkbenchState): string {
  const vm = toSettingsViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel" data-testid="settings-theme-section">
        <div class="panel-head"><div><h2>${t("settings.title")}</h2><p>${t("settings.description")}</p></div></div>
        ${renderFeatureGuide("settings")}
        <div class="metrics">${renderMetric(t("settings.root"), vm.rootDir, state.errors.config ?? "")}${renderMetric(t("settings.autoUpdates"), vm.autoUpdate)}${renderMetric(t("settings.theme"), vm.theme)}${renderMetric(t("settings.language"), vm.language)}${renderMetric(t("settings.powershell"), vm.powershell, vm.powershellDetail)}</div>
        <div class="form-grid"><input id="settings-root" data-testid="settings-root-directory" value="${escapeHtml(vm.rootInput)}" readonly placeholder="${t("settings.rootDirectory")}" />${renderActionButton("choose-settings-root-dir", localize("Choose root directory", "选择根目录"))}</div>
        <div class="segmented">
          ${(["light", "dark", "system", "high-contrast"] as const).map((mode) => `<button data-theme-mode="${mode}" class="${state.theme === mode ? "active" : ""}" type="button">${themeModeLabel(mode)}</button>`).join("")}
        </div>
        <div class="segmented" aria-label="${t("settings.language")}">
          ${(["auto", "zh-CN", "en-US"] as LocaleMode[]).map((mode) => `<button data-locale-mode="${mode}" class="${getLocaleMode() === mode ? "active" : ""}" type="button">${localeModeLabel(mode)}</button>`).join("")}
        </div>
        <div class="toolbar">
          ${renderActionButton("save-root-dir", t("settings.saveRoot"), "primary")}
          ${renderActionButton("toggle-auto-update", t("settings.toggleAutoUpdate"))}
          ${renderActionButton("open-config-dir", t("settings.openConfigDir"))}
          ${renderActionButton("show-safety-notice", t("settings.viewSafetyNotice"))}
          ${renderActionButton("toggle-advanced-mode", isAdvancedMode() ? t("settings.advancedOff") : t("settings.advancedOn"))}
          ${renderActionButton("reset-ui-config", t("settings.resetUiConfig"), "danger")}
        </div>
        <div class="settings-port-scan" data-testid="settings-port-scan-section">
          <div><strong>${localize("Startup developer-port scan", "启动后自动扫描开发端口")}</strong><p>${localize("Runs once after the safety gate and first render. It never blocks the Dashboard.", "安全声明和首屏渲染完成后后台运行一次，不会阻塞仪表盘。")}</p></div>
          ${renderActionButton("toggle-auto-port-scan", state.config?.settings.autoScanPortsOnStartup ? localize("Disable", "关闭") : localize("Enable", "开启"))}
          <label>${localize("Default scope", "默认范围")}<select id="settings-port-scan-scope" data-testid="settings-port-scan-scope"><option value="recommended" ${state.config?.settings.portScanScope !== "full" ? "selected" : ""}>${localize("Recommended: listening, bound and active", "推荐：监听、绑定和活动端口")}</option><option value="full" ${state.config?.settings.portScanScope === "full" ? "selected" : ""}>${localize("Full: all connection states", "完整：全部连接状态")}</option></select></label>
        </div>
      </section>
      ${renderRiskLevelGuide()}
      ${renderUpdatePanel(state, vm.updateRows, vm.updateDownloadRows)}
      <section class="panel" data-testid="settings-uninstall-section">
        <div class="panel-head"><div><h2>${localize("Uninstall DevEnv Manager", "卸载 DevEnv Manager")}</h2><p>${localize("Starts the registered Windows uninstaller. User configuration is retained unless you explicitly remove it in the uninstaller.", "启动 Windows 已注册的卸载程序。除非在卸载程序中明确选择删除，否则会保留用户配置。")}</p></div></div>
        <div class="small-note">${localize("The application closes after the official uninstaller starts. This action does not silently delete user configuration or managed runtimes.", "正式卸载程序启动后应用会关闭；此操作不会静默删除用户配置或受管运行时。")}</div>
        <div class="toolbar">${renderActionButton("self-uninstall", localize("Open uninstaller", "打开卸载程序"), "danger")}</div>
        <div data-testid="settings-uninstall-result">${state.uninstallError ? `<div class="error-state">${escapeHtml(state.uninstallError)}</div>` : state.uninstallResult ? `<div class="small-note">${escapeHtml(state.uninstallResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}</div>
      </section>
      <section class="panel" data-testid="settings-operation-result"><h2>${localize("Operation result", "操作结果")}</h2>${state.operationError ? `<div class="error-state">${escapeHtml(state.operationError)}</div>` : ""}${state.operationResult ? `<div class="small-note">${escapeHtml(state.operationResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}</section>
      <section class="panel"><h2>${t("settings.powershellRunner")}</h2>${renderRows(vm.powershellRows)}</section>
      ${isAdvancedMode() ? renderDebugPanel(state.debugPage) : ""}
    </div>
  `;
}

function renderUpdatePanel(
  state: SettingsWorkbenchState,
  rows: Array<{ label: string; value: string }>,
  downloadRows: Array<{ label: string; value: string }>,
): string {
  const download = state.updateDownload;
  return `<section class="panel" data-testid="settings-update-section">
    <div class="panel-head"><div><h2>${t("settings.updateSource")}</h2><p>${localize("Check metadata, download from the selected source, verify size and SHA-256, then confirm before launching the installer.", "检查更新元数据，从所选来源下载并验证大小与 SHA-256，确认后再启动安装程序。")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("check-for-updates", t("dashboard.checkUpdates"), "primary")}
      ${renderActionButton("download-update", localize("Download and verify", "下载并验证"))}
      ${renderActionButton("launch-update-installer", localize("Launch verified installer", "启动已验证的安装程序"), "danger")}
    </div>
    ${state.updateError ? `<div class="error-state" data-testid="settings-update-error">${escapeHtml(state.updateError)}</div>` : ""}
    ${renderRows(rows)}
    <div data-testid="settings-update-result">${download ? renderRows(downloadRows) : `<div class="empty">${localize("No downloaded update has been verified.", "尚未验证已下载的更新。")}</div>`}</div>
  </section>`;
}

function themeModeLabel(mode: "light" | "dark" | "system" | "high-contrast"): string {
  if (mode === "light") return t("app.theme.light");
  if (mode === "dark") return t("app.theme.dark");
  if (mode === "system") return t("app.theme.system");
  return t("app.theme.highContrast");
}

function renderRows(rows: Array<{ label: string; value: string }>): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("")}</dl>`;
}

function renderDebugPanel(page: number): string {
  const entries = filterDebugEntries(getDebugEntries(), {});
  const paged = pageItems(entries, page, 40);
  return `<section class="panel" id="debug-panel" data-testid="settings-debug-section">
    <div class="panel-head" data-testid="settings-advanced-section"><div><h2>${t("settings.debugPanel")}</h2><p>${t("settings.debugPanelDetail")}</p></div></div>
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
