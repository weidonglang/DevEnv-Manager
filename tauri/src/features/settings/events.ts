import type { FeatureContext } from "../../app/featureContext";
import { showSafetyNoticeDialog } from "../../components/disclaimerPanel";
import { localeModeLabel, setLocale, t, type LocaleMode } from "../../core/i18n";
import { applyTheme, readTheme, type ThemeMode } from "../../ui/theme/controller";
import { bindAction, valueOf } from "../sharedView";
import { checkForUpdates, loadSettingsWorkbench, openAppConfigDir, powershellRunnerStatus, resetUiConfig, setAutoCheckUpdate, setRootDir } from "./api";
import { renderSettingsWorkbench } from "./render";
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
    state.config = await setRootDir(context.root.querySelector<HTMLInputElement>("#settings-root")?.value.trim() ?? "");
    context.toast(t("settings.rootSaved"));
  });
  bindAction(context.root, "toggle-auto-update", async () => {
    state.config = await setAutoCheckUpdate(valueOf(state.config, "autoCheckUpdate") !== "true");
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "check-update", async () => {
    state.update = await checkForUpdates();
    context.root.innerHTML = renderSettingsWorkbench(state);
    bindSettingsEvents(context, state);
  });
  bindAction(context.root, "open-config-dir", openAppConfigDir);
  bindAction(context.root, "show-safety-notice", () => showSafetyNoticeDialog());
  bindAction(context.root, "reset-ui-config", resetUiConfig);
}

export async function refreshSettings(context: FeatureContext, state: SettingsWorkbenchState): Promise<void> {
  const [config, powershell, update] = await Promise.all([loadSettingsWorkbench(), powershellRunnerStatus(), checkForUpdates()]);
  state.config = config;
  state.powershell = powershell;
  state.update = update;
  state.theme = readTheme();
  context.root.innerHTML = renderSettingsWorkbench(state);
  bindSettingsEvents(context, state);
}
