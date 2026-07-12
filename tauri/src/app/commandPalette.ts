import { setLocale, t, type TranslationKey } from "../core/i18n";
import { navigateTo, routeLabel, workbenchRoutes } from "./router";
import { applyTheme, type ThemeMode } from "../ui/theme/controller";
import type { WorkbenchView } from "./state";

type PaletteCommand = {
  id: string;
  title: string;
  view?: WorkbenchView;
  action?: string;
  run?: () => void;
  safe: boolean;
};

const actionCommandSpecs: Array<Omit<PaletteCommand, "title"> & { titleKey: TranslationKey }> = [
  { id: "doctor:run", titleKey: "palette.doctorRun", view: "reports", action: "run-doctor-report", safe: true },
  { id: "doctor:repair-plan", titleKey: "palette.doctorRepairPlan", view: "reports", safe: true },
  { id: "environment:inspect", titleKey: "palette.environmentInspect", view: "environment", action: "inspect-environment", safe: true },
  { id: "environment:java-plan", titleKey: "palette.environmentJavaPlan", view: "environment", action: "create-java-plan", safe: true },
  { id: "ports:scan", titleKey: "palette.portsScan", view: "ports", action: "scan-ports", safe: true },
  { id: "ports:diagnose", titleKey: "palette.portsDiagnose", view: "ports", action: "create-port-plan", safe: true },
  { id: "assoc:search", titleKey: "palette.assocSearch", view: "fileAssociations", action: "search-association-app", safe: true },
  { id: "assoc:plan", titleKey: "palette.assocPlan", view: "fileAssociations", action: "create-association-plan", safe: true },
  { id: "profiles:apply", titleKey: "palette.profilesApply", view: "profiles", action: "create-profile-plan", safe: false },
  { id: "profiles:plan", titleKey: "palette.profilesPlan", view: "profiles", action: "create-profile-plan", safe: true },
  { id: "reports:doctor", titleKey: "palette.reportsDoctor", view: "reports", action: "export-doctor-markdown", safe: true },
  { id: "reports:environment", titleKey: "palette.reportsEnvironment", view: "reports", action: "export-environment-report", safe: true },
  { id: "reports:assoc", titleKey: "palette.reportsAssoc", view: "reports", action: "export-file-association-report", safe: true },
  { id: "settings:update", titleKey: "palette.settingsUpdate", view: "settings", action: "check-for-updates", safe: true },
  { id: "theme:light", titleKey: "palette.themeLight", safe: true, run: () => applyTheme("light") },
  { id: "theme:dark", titleKey: "palette.themeDark", safe: true, run: () => applyTheme("dark") },
  { id: "theme:system", titleKey: "palette.themeSystem", safe: true, run: () => applyTheme("system") },
  { id: "theme:contrast", titleKey: "palette.themeHighContrast", safe: true, run: () => applyTheme("high-contrast" as ThemeMode) },
  { id: "cleanup:backups", titleKey: "palette.cleanupBackups", view: "cleanup", safe: true },
  { id: "settings:config-dir", titleKey: "palette.settingsConfigDir", view: "settings", action: "open-config-dir", safe: true },
  { id: "language:auto", titleKey: "palette.languageAuto", safe: true, run: () => setLocale("auto") },
  { id: "language:zh", titleKey: "palette.languageChinese", safe: true, run: () => setLocale("zh-CN") },
  { id: "language:en", titleKey: "palette.languageEnglish", safe: true, run: () => setLocale("en-US") },
];

function commands(): PaletteCommand[] {
  return [
    ...workbenchRoutes.map((route) => ({
      id: `view:${route.id}`,
      title: t("palette.goTo", { view: routeLabel(route) }),
      view: route.id,
      safe: true,
    })),
    ...actionCommandSpecs.map(({ titleKey, ...command }) => ({ ...command, title: t(titleKey) })),
  ];
}

export function registerCommandPalette(): void {
  let palette: HTMLDivElement | null = null;
  let selected = 0;
  let previousFocus: HTMLElement | null = null;

  const close = () => {
    palette?.remove();
    palette = null;
    selected = 0;
    previousFocus?.focus();
    previousFocus = null;
  };

  const run = (command: PaletteCommand) => {
    close();
    command.run?.();
    if (command.view) {
      navigateTo(command.view);
      if (command.action) {
        window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-action="${command.action}"]`)?.click(), 100);
      }
    }
  };

  const open = () => {
    close();
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    palette = document.createElement("div");
    palette.className = "command-palette";
    palette.innerHTML = `
      <div class="command-palette__panel" role="dialog" aria-modal="true" aria-label="${t("app.commandPalette")}">
        <input class="command-palette__search" type="search" placeholder="${t("palette.search")}" aria-label="${t("palette.search")}" autofocus />
        <div class="command-palette__list" role="listbox"></div>
      </div>
    `;
    document.body.appendChild(palette);

    const input = palette.querySelector<HTMLInputElement>(".command-palette__search");
    const list = palette.querySelector<HTMLDivElement>(".command-palette__list");
    const allCommands = commands();
    let visible: PaletteCommand[] = [];

    const render = () => {
      const query = input?.value.trim().toLowerCase() ?? "";
      visible = allCommands.filter((command) => command.title.toLowerCase().includes(query)).slice(0, 18);
      selected = Math.min(selected, Math.max(visible.length - 1, 0));
      if (list) {
        list.innerHTML = visible.length
          ? visible
              .map(
                (command, index) =>
                  `<button class="command-palette__item ${index === selected ? "active" : ""}" data-command="${command.id}" role="option" aria-selected="${index === selected ? "true" : "false"}"><span>${command.title}</span><small>${command.safe ? t("state.safe") : t("state.planOnly")}</small></button>`,
              )
              .join("")
          : `<div class="command-palette__empty" role="status">${t("state.noMatchingCommands")}</div>`;
      }
    };

    input?.addEventListener("input", () => {
      selected = 0;
      render();
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selected = visible.length ? (selected + 1) % visible.length : 0;
        render();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selected = visible.length ? (selected - 1 + visible.length) % visible.length : 0;
        render();
      } else if (event.key === "Enter" && visible[selected]) {
        event.preventDefault();
        run(visible[selected]);
      }
    });
    list?.addEventListener("click", (event) => {
      const item = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-command]") : null;
      const command = visible.find((entry) => entry.id === item?.dataset.command);
      if (command) run(command);
    });
    palette.addEventListener("click", (event) => {
      if (event.target === palette) close();
    });
    render();
    input?.focus();
  };

  window.addEventListener("devenv:open-command-palette", open);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && palette) {
      close();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      open();
    }
  });
}
