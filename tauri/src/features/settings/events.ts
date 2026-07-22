import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { showSafetyNoticeDialog } from "../../components/disclaimerPanel";
import { clearDebugEntries, debugEntriesAsMarkdown, getDebugEntries, isAdvancedMode, logDebug, setAdvancedMode } from "../../core/debugLog";
import { localeModeLabel, localize, setLocale, t, type LocaleMode } from "../../core/i18n";
import { applyTheme, readTheme, type ThemeMode } from "../../ui/theme/controller";
import { bindAction } from "../sharedView";
import { checkForUpdates, downloadUpdate, launchUpdateInstaller, loadSettingsWorkbench, openAppConfigDir, powershellRunnerStatus, resetUiConfig, selfUninstall, setAutoCheckUpdate, setPortScanPreferences, setRootDir } from "./api";
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
  bindAction(context.root, "choose-settings-root-dir", async () => {
    state.operationError = "";
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) return;
      const input = context.root.querySelector<HTMLInputElement>("#settings-root");
      if (input) input.value = selected;
      state.operationResult = `${localize("Selected root directory", "已选择根目录")}：${selected}`;
    } catch (error) {
      state.operationError = errorMessage(error);
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
    }
  });
  bindAction(context.root, "toggle-auto-update", async () => {
    state.config = await setAutoCheckUpdate(!state.config?.settings.autoCheckUpdate);
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "toggle-auto-port-scan", async () => {
    if (!state.config) return;
    state.operationError = "";
    try {
      state.config = await setPortScanPreferences(!state.config.settings.autoScanPortsOnStartup, state.config.settings.portScanScope);
      state.operationResult = localize("Startup port scan preference saved.", "启动端口扫描设置已保存。");
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  context.root.querySelector<HTMLSelectElement>("#settings-port-scan-scope")?.addEventListener("change", async (event) => {
    if (!state.config) return;
    const scope = (event.target as HTMLSelectElement).value === "full" ? "full" : "recommended";
    state.operationError = "";
    try {
      state.config = await setPortScanPreferences(state.config.settings.autoScanPortsOnStartup, scope);
      state.operationResult = localize("Port scan scope saved.", "端口扫描范围已保存。");
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "check-for-updates", async () => {
    state.updateError = "";
    state.updateDownload = null;
    context.progress.start(t("feature.settings.checkingUpdateMetadata"));
    try {
      state.update = await checkForUpdates();
      context.progress.done(t("feature.settings.updateMetadataLoaded"));
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
      state.updateError = state.update ? localize("The current version is already up to date.", "当前版本已是最新版本。") : localize("Check for updates before downloading.", "下载前请先检查更新。");
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      return;
    }
    context.progress.start(t("feature.settings.downloadingUpdate", { fileName: state.update.fileName }));
    try {
      state.updateDownload = await downloadUpdate();
      context.progress.done(t("feature.settings.updateDownloadedVerified"));
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
      state.updateError = localize("Download and verify the update before launching its installer.", "启动安装器前请先下载并验证更新。");
      context.root.innerHTML = renderSettingsWorkbench(state);
      bindSettingsEvents(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "launch_update_installer",
        planId: `update:${update.latestVersion}:${update.sha256}`,
        riskLevel: "high",
        title: localize("Launch verified update installer", "启动已验证的更新安装器"),
        summary: localize("Starts the downloaded installer after backend size and SHA-256 verification.", "后端验证文件大小和 SHA-256 后启动已下载的安装器。"),
        before: [
          { label: localize("Version", "版本"), value: update.latestVersion },
          { label: localize("Platform", "平台"), value: update.platform },
          { label: localize("File", "文件"), value: update.fileName },
          { label: localize("Source", "来源"), value: download.sourceUrl },
          { label: localize("Size", "大小"), value: `${download.size.toLocaleString()} bytes` },
          { label: "SHA-256", value: download.sha256 },
        ],
        warnings: [localize("DevEnv Manager closes after the installer starts.", "安装器启动后 DevEnv Manager 将关闭。"), localize("Review the verified asset identity before continuing.", "继续前请检查已验证的资产身份。")],
        execute: launchUpdateInstaller,
      });
      state.operationResult = resultMessage(result, localize("Update installer started.", "更新安装器已启动。"));
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
        title: localize("Open DevEnv Manager uninstaller", "打开 DevEnv Manager 卸载程序"),
        summary: localize("Starts the registered Windows uninstaller without silently deleting user configuration.", "启动 Windows 中已注册的卸载程序，不会静默删除用户配置。"),
        warnings: [localize("The application closes after the uninstaller starts.", "卸载程序启动后应用将关闭。"), localize("Review any data-removal option shown by the official uninstaller.", "请检查官方卸载程序显示的所有数据移除选项。")],
        execute: selfUninstall,
      });
      state.uninstallResult = resultMessage(result, localize("Uninstaller started.", "卸载程序已启动。"));
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
