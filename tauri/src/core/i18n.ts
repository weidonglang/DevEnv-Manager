import { enUS } from "./locales/en-US";
import { zhCN } from "./locales/zh-CN";

export type LocaleMode = "auto" | "zh-CN" | "en-US";
export type ActiveLocale = "zh-CN" | "en-US";
export type TranslationKey = keyof typeof enUS;

const STORAGE_KEY = "devenv.locale";
const LOCALE_EVENT = "devenv:locale-change";
const dictionaries: Record<ActiveLocale, Record<TranslationKey, string>> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

let localeMode: LocaleMode = readStoredLocaleMode();

export function t(key: TranslationKey, params: Record<string, string | number> = {}): string {
  const dictionary = dictionaries[getActiveLocale()];
  const template = dictionary[key] ?? dictionaries["en-US"][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function localize(english: string, chinese: string): string {
  return getActiveLocale() === "zh-CN" ? chinese : english;
}

export function setLocale(mode: LocaleMode): void {
  localeMode = isLocaleMode(mode) ? mode : "auto";
  localStorage.setItem(STORAGE_KEY, localeMode);
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: getActiveLocale() }));
}

export function getLocaleMode(): LocaleMode {
  return localeMode;
}

export function getActiveLocale(): ActiveLocale {
  return localeMode === "auto" ? detectSystemLocale() : localeMode;
}

export function detectSystemLocale(): ActiveLocale {
  const language = navigator.language || navigator.languages?.[0] || "";
  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export function subscribeLocaleChange(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(LOCALE_EVENT, handler);
  return () => window.removeEventListener(LOCALE_EVENT, handler);
}

export function localeModeLabel(mode: LocaleMode): string {
  if (mode === "auto") return `${t("settings.locale.auto")} / ${t("settings.locale.autoDetail")}`;
  if (mode === "zh-CN") return t("settings.locale.zh");
  return t("settings.locale.en");
}

function readStoredLocaleMode(): LocaleMode {
  const value = localStorage.getItem(STORAGE_KEY);
  return isLocaleMode(value) ? value : "auto";
}

function isLocaleMode(value: unknown): value is LocaleMode {
  return value === "auto" || value === "zh-CN" || value === "en-US";
}
