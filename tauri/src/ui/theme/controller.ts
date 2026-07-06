export type ThemeMode = "light" | "dark" | "system" | "high-contrast";

const THEME_KEY = "devenv-manager.theme";

export function readTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" || saved === "system" || saved === "high-contrast" ? saved : "system";
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  localStorage.setItem(THEME_KEY, mode);
}

export function registerThemeSync(): void {
  applyTheme(readTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readTheme() === "system") applyTheme("system");
  });
}
