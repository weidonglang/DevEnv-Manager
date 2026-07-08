import { getActiveLocale, getLocaleMode, localeModeLabel, t } from "../../core/i18n";
import type { SettingsWorkbenchState } from "./state";

export type SettingsViewModel = {
  rootDir: string;
  rootInput: string;
  autoUpdate: string;
  theme: string;
  language: string;
  powershell: string;
  powershellDetail: string;
  updateRows: Array<{ label: string; value: string }>;
  powershellRows: Array<{ label: string; value: string }>;
};

export function toSettingsViewModel(state: SettingsWorkbenchState): SettingsViewModel {
  return {
    rootDir: state.errors.config ? failed(state.errors.config) : present(state.config?.settings.rootDir, notLoaded()),
    rootInput: state.config?.settings.rootDir ?? "",
    autoUpdate: state.errors.config ? failed(state.errors.config) : autoUpdateLabel(state.config?.settings.autoCheckUpdate),
    theme: state.theme,
    language: localeModeLabel(getLocaleMode()),
    powershell: powershellStatus(state),
    powershellDetail: state.errors.powershell ?? powershellDetail(state),
    updateRows: [
      { label: label("Current version", "当前版本"), value: present(state.update?.currentVersion, notChecked()) },
      { label: label("Latest version", "最新版本"), value: present(state.update?.latestVersion, notChecked()) },
      { label: label("Update source", "更新源"), value: present(state.update?.sourceName, notChecked()) },
      { label: label("Source URL", "源地址"), value: present(state.update?.sourceUrl, notChecked()) },
      { label: label("Checked at", "检查时间"), value: formatTimestamp(state.update?.checkedAt) },
      { label: label("Failed sources", "失败源"), value: list(state.update?.failedSources) },
    ],
    powershellRows: [
      { label: label("Status", "状态"), value: powershellStatus(state) },
      { label: label("Executable", "执行程序"), value: present(state.powershell?.executable, notChecked()) },
      { label: label("Version", "版本"), value: powershellVersion(state) },
      { label: label("Elapsed", "耗时"), value: state.powershell ? `${state.powershell.elapsedMs} ms` : notChecked() },
      { label: label("stderr", "错误输出"), value: present(state.powershell?.stderr, label("No error output", "无错误输出")) },
    ],
  };
}

function powershellStatus(state: SettingsWorkbenchState): string {
  if (state.errors.powershell) return failed(state.errors.powershell);
  if (!state.powershell) return notChecked();
  if (state.powershell.timedOut) return label("Timed out", "检查超时");
  if (state.powershell.success || state.powershell.stdout.trim()) return `${label("Available", "可用")}：PowerShell ${powershellVersion(state)}`;
  return label("Check failed", "检查失败");
}

function powershellDetail(state: SettingsWorkbenchState): string {
  if (!state.powershell) return "";
  return `${state.powershell.executable} - ${state.powershell.elapsedMs} ms`;
}

function powershellVersion(state: SettingsWorkbenchState): string {
  const stdout = state.powershell?.stdout.trim();
  return stdout || notChecked();
}

function autoUpdateLabel(value: boolean | undefined): string {
  if (value === undefined) return notLoaded();
  return value ? label("Enabled", "开启") : label("Disabled", "关闭");
}

function formatTimestamp(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return notChecked();
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    return new Date((number < 10_000_000_000 ? number * 1000 : number)).toLocaleString();
  }
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
  if (text.startsWith("SystemTime")) return label("Legacy debug timestamp", "旧版调试时间戳");
  return text;
}

function present(value: unknown, fallback = t("state.notAvailable")): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function list(values: unknown[] | undefined): string {
  return values?.length ? values.map(String).join(", ") : label("None", "无");
}

function notLoaded(): string {
  return label("Loading settings...", "正在读取设置...");
}

function notChecked(): string {
  return label("Not checked yet", "尚未检查");
}

function failed(error: string): string {
  return label(`Failed: ${error}`, `失败：${error}`);
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
