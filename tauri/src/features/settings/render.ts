import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { getLocaleMode, localeModeLabel, t, type LocaleMode } from "../../core/i18n";
import { renderFeatureGuide, renderRiskLevelGuide } from "../../components/featureGuide";
import type { SettingsWorkbenchState } from "./state";

export function renderSettingsWorkbench(state: SettingsWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("settings.title")}</h2><p>${t("settings.description")}</p></div></div>
        ${renderFeatureGuide("settings")}
        <div class="metrics">${renderMetric(t("settings.root"), valueOf(state.config, "rootDir"))}${renderMetric(t("settings.autoUpdates"), valueOf(state.config, "autoCheckUpdate"))}${renderMetric(t("settings.theme"), state.theme)}${renderMetric(t("settings.language"), localeModeLabel(getLocaleMode()))}${renderMetric(t("settings.powershell"), valueOf(state.powershell, "status"))}</div>
        <div class="form-grid"><input id="settings-root" value="${escapeHtml(valueOf(state.config, "rootDir", ""))}" placeholder="${t("settings.rootDirectory")}" /></div>
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
          ${renderActionButton("reset-ui-config", t("settings.resetUiConfig"), "danger")}
        </div>
      </section>
      ${renderRiskLevelGuide()}
      <section class="panel"><h2>${t("settings.updateSource")}</h2>${renderObjectTable(state.update, ["currentVersion", "latestVersion", "sourceName", "sourceUrl", "checkedAt"])}</section>
      <section class="panel"><h2>${t("settings.powershellRunner")}</h2>${renderObjectTable(state.powershell, ["status", "message", "stdout", "stderr"])}</section>
    </div>
  `;
}
