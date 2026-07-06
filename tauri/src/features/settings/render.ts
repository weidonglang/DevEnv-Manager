import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { SettingsWorkbenchState } from "./state";

export function renderSettingsWorkbench(state: SettingsWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Settings</h2><p>Root directory, updates, theme, safety disclaimer, config directory, and runner status.</p></div></div>
        <div class="metrics">${renderMetric("Root", valueOf(state.config, "rootDir"))}${renderMetric("Auto updates", valueOf(state.config, "autoCheckUpdate"))}${renderMetric("Theme", state.theme)}${renderMetric("PowerShell", valueOf(state.powershell, "status"))}</div>
        <div class="form-grid"><input id="settings-root" value="${escapeHtml(valueOf(state.config, "rootDir", ""))}" placeholder="Root directory" /></div>
        <div class="segmented">
          ${(["light", "dark", "system", "high-contrast"] as const).map((mode) => `<button data-theme-mode="${mode}" class="${state.theme === mode ? "active" : ""}" type="button">${mode}</button>`).join("")}
        </div>
        <div class="toolbar">
          ${renderActionButton("save-root-dir", "Save root directory", "primary")}
          ${renderActionButton("toggle-auto-update", "Toggle auto update")}
          ${renderActionButton("check-update", "Check Update")}
          ${renderActionButton("open-config-dir", "Open app config dir")}
          ${renderActionButton("reset-ui-config", "Reset UI config", "danger")}
        </div>
      </section>
      <section class="panel"><h2>Update source</h2>${renderObjectTable(state.update, ["currentVersion", "latestVersion", "sourceName", "sourceUrl", "checkedAt"])}</section>
      <section class="panel"><h2>PowerShell runner</h2>${renderObjectTable(state.powershell, ["status", "message", "stdout", "stderr"])}</section>
    </div>
  `;
}
