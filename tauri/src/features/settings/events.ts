import type { FeatureContext } from "../../app/featureContext";
import { showSafetyNoticeDialog } from "../../components/disclaimerPanel";
import { clearDebugEntries, debugEntriesAsMarkdown, getDebugEntries, isAdvancedMode, logDebug, setAdvancedMode } from "../../core/debugLog";
import { localeModeLabel, setLocale, t, type LocaleMode } from "../../core/i18n";
import { applyTheme, readTheme, type ThemeMode } from "../../ui/theme/controller";
import { bindAction } from "../sharedView";
import { checkForUpdates, downloadUpdate, launchUpdateInstaller, loadSettingsWorkbench, openAppConfigDir, powershellRunnerStatus, resetUiConfig, selfUninstall, setAutoCheckUpdate, setRootDir } from "./api";
import { filterDebugEntries, renderDebugEntriesPreview, renderSettingsWorkbench, type DebugFilter } from "./render";
import type { SettingsWorkbenchState } from "./state";

export function bindSettingsEvents(context: FeatureContext, state: SettingsWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-theme-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.themeMode as ThemeMode;
      applyTheme(state.theme);
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-locale-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.localeMode as LocaleMode;
      setLocale(mode);
      context.toast(t("settings.languageSaved", { language: localeModeLabel(mode) }));
    });
  });
  bindAction(context.root, "save-root-dir", async () => {
    state.operationResult = "";
    state.operationError = "";
    try {
      state.config = await setRootDir(context.root.querySelector<HTMLInputElement>("#settings-root")?.value.trim() ?? "");
      state.operationResult = t("settings.rootSaved");
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      context.toast(t("settings.rootSaved"));
    } catch (error) {
      state.operationError = errorMessage(error);
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      context.toast(state.operationError, true);
    }
  });
  bindAction(context.root, "toggle-auto-update", async () => {
    state.config = await setAutoCheckUpdate(!state.config?.settings.autoCheckUpdate);
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "check-for-updates", async () => {
    state.updateError = "";
    state.updateDownload = null;
    context.progress.start("Checking update metadata");
    try {
      state.update = await checkForUpdates();
      context.progress.done("Update metadata loaded");
    } catch (error) {
      state.updateError = errorMessage(error);
      context.progress.fail(state.updateError);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "download-update", async () => {
    state.updateError = "";
    state.updateDownload = null;
    if (!state.update?.updateAvailable) {
      state.updateError = state.update ? "The current version is already up to date." : "Check for updates before downloading.";
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      return;
    }
    context.progress.start(`Downloading ${state.update.fileName}`);
    try {
      state.updateDownload = await downloadUpdate();
      context.progress.done("Update downloaded and verified");
    } catch (error) {
      state.updateError = errorMessage(error);
      context.progress.fail(state.updateError);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "launch-update-installer", async () => {
    state.updateError = "";
    const update = state.update;
    const download = state.updateDownload;
    if (!update || !download?.verified) {
      state.updateError = "Download and verify the update before launching its installer.";
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "launch_update_installer",
        planId: `update:${update.latestVersion}:${update.sha256}`,
        riskLevel: "high",
        title: "Launch verified update installer",
        summary: "Starts the downloaded installer after backend size and SHA-256 verification.",
        before: [
          { label: "Version", value: update.latestVersion },
          { label: "Platform", value: update.platform },
          { label: "File", value: update.fileName },
          { label: "Source", value: download.sourceUrl },
          { label: "Size", value: `${download.size.toLocaleString()} bytes` },
          { label: "SHA-256", value: download.sha256 },
        ],
        warnings: ["DevEnv Manager closes after the installer starts.", "Review the verified asset identity before continuing."],
        execute: launchUpdateInstaller,
      });
      state.operationResult = resultMessage(result, "Update installer started.");
    } catch (error) {
      state.updateError = errorMessage(error);
      if (context.isCurrent()) {
        context.root.innerHTML = renderSettingsWorkbench(state);
        bindSettingsEvents(context, state);
      }
    }
  });
  bindAction(context.root, "self-uninstall", async () => {
    state.uninstallResult = "";
    state.uninstallError = "";
    try {
      const result = await context.risk.run({
        command: "self_uninstall",
        planId: "self-uninstall",
        riskLevel: "high",
        title: "Open DevEnv Manager uninstaller",
        summary: "Starts the registered Windows uninstaller without silently deleting user configuration.",
        warnings: ["The application closes after the uninstaller starts.", "Review any data-removal option shown by the official uninstaller."],
        execute: selfUninstall,
      });
      state.uninstallResult = resultMessage(result, "Uninstaller started.");
    } catch (error) {
      state.uninstallError = errorMessage(error);
      if (context.isCurrent()) {
        context.root.innerHTML = renderSettingsWorkbench(state);
        bindSettingsEvents(context, state);
      }
    }
  });
  bindAction(context.root, "open-config-dir", async () => {
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await openAppConfigDir();
      state.operationResult = resultMessage(result, t("settings.openConfigDir"));
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "show-safety-notice", () => showSafetyNoticeDialog());
  bindAction(context.root, "toggle-advanced-mode", () => {
    setAdvancedMode(!isAdvancedMode());
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "refresh-debug-log", () => {
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "copy-debug-log", async () => {
    await navigator.clipboard.writeText(debugEntriesAsMarkdown(readFilteredDebugEntries(context)));
    state.operationResult = t("settings.debugCopied");
    state.operationError = "";
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
    context.toast(t("settings.debugCopied"));
  });
  bindAction(context.root, "export-debug-markdown", () => exportDebug("devenv-debug-log.md", debugEntriesAsMarkdown(readFilteredDebugEntries(context)), "text/markdown"));
  bindAction(context.root, "export-debug-json", () => exportDebug("devenv-debug-log.json", JSON.stringify(readFilteredDebugEntries(context), null, 2), "application/json"));
  bindAction(context.root, "clear-debug-log", () => {
    clearDebugEntries();
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "reset-ui-config", resetUiConfig);
  bindDebugFilters(context, state);
}

export async function refreshSettings(context: FeatureContext, state: SettingsWorkbenchState): Promise<void> {
  const [config, powershell, update] = await Promise.allSettled([loadSettingsWorkbench(), powershellRunnerStatus(), checkForUpdates()]);
  if (!context.isCurrent()) return;
  state.errors = {};
  if (config.status === "fulfilled") state.config = config.value;
  else state.errors.config = errorMessage(config.reason);
  if (powershell.status === "fulfilled") state.powershell = powershell.value;
  else state.errors.powershell = errorMessage(powershell.reason);
  if (update.status === "fulfilled") state.update = update.value;
  else state.errors.update = errorMessage(update.reason);
  state.theme = readTheme();
  context.root.innerHTML = renderSettingsWorkbench(state);
  bindSettingsEvents(context, state);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  if (typeof result === "string" && result.trim()) return result;
  return fallback;
}

function exportDebug(fileName: string, content: string, type: string): void {
  logDebug({ type: "export", name: fileName, status: "info", data: { type, bytes: content.length } });
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function bindDebugFilters(context: FeatureContext, state: SettingsWorkbenchState): void {
  const panel = context.root.querySelector<HTMLElement>("#debug-panel");
  if (!panel) return;
  const update = () => {
    const preview = panel.querySelector<HTMLElement>("#debug-log-preview");
    if (!preview) return;
    state.debugPage = 1;
    preview.innerHTML = renderDebugEntriesPreview(readFilteredDebugEntries(context));
  };
  panel.querySelector<HTMLSelectElement>("#debug-filter-type")?.addEventListener("change", update);
  panel.querySelector<HTMLSelectElement>("#debug-filter-status")?.addEventListener("change", update);
  panel.querySelector<HTMLInputElement>("#debug-filter-current-view")?.addEventListener("change", update);
  panel.querySelector<HTMLInputElement>("#debug-search")?.addEventListener("input", update);
  panel.querySelectorAll<HTMLButtonElement>("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.pageAction === "debug-log:prev") state.debugPage = Math.max(1, state.debugPage - 1);
      if (button.dataset.pageAction === "debug-log:next") state.debugPage += 1;
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
    });
  });
}

function readFilteredDebugEntries(context: FeatureContext) {
  return filterDebugEntries(getDebugEntries(), readDebugFilter(context));
}

function readDebugFilter(context: FeatureContext): DebugFilter {
  const panel = context.root.querySelector<HTMLElement>("#debug-panel");
  if (!panel) return {};
  return {
    type: panel.querySelector<HTMLSelectElement>("#debug-filter-type")?.value || undefined,
    status: panel.querySelector<HTMLSelectElement>("#debug-filter-status")?.value || undefined,
    currentView: panel.querySelector<HTMLInputElement>("#debug-filter-current-view")?.checked ? context.view : undefined,
    search: panel.querySelector<HTMLInputElement>("#debug-search")?.value || undefined,
  };
}
