import { navigateTo, workbenchRoutes } from "./router";
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

const actionCommands: PaletteCommand[] = [
  { id: "doctor:run", title: "Run Doctor", view: "reports", action: "run-doctor-report", safe: true },
  { id: "doctor:repair-plan", title: "Create Doctor Repair Plan", view: "reports", safe: true },
  { id: "environment:inspect", title: "Inspect Environment", view: "environment", action: "inspect-environment", safe: true },
  { id: "environment:java-plan", title: "Create Java Stabilize Plan", view: "environment", action: "create-java-plan", safe: true },
  { id: "ports:scan", title: "Scan Ports", view: "ports", action: "scan-ports", safe: true },
  { id: "ports:diagnose", title: "Diagnose Selected Port", view: "ports", action: "create-port-plan", safe: true },
  { id: "assoc:search", title: "Search File Association App", view: "fileAssociations", action: "search-association-app", safe: true },
  { id: "assoc:plan", title: "Create File Association Plan", view: "fileAssociations", action: "create-association-plan", safe: true },
  { id: "profiles:apply", title: "Apply Config Profile", view: "profiles", action: "create-profile-plan", safe: false },
  { id: "profiles:plan", title: "Create Profile Apply Plan", view: "profiles", action: "create-profile-plan", safe: true },
  { id: "reports:doctor", title: "Export Doctor Report", view: "reports", action: "export-doctor-markdown", safe: true },
  { id: "reports:environment", title: "Export Environment Report", view: "reports", action: "export-environment-report", safe: true },
  { id: "reports:assoc", title: "Export File Association Report", view: "reports", action: "export-file-association-report", safe: true },
  { id: "settings:update", title: "Check Update", view: "settings", action: "check-update", safe: true },
  { id: "theme:light", title: "Switch Theme: Light", safe: true, run: () => applyTheme("light") },
  { id: "theme:dark", title: "Switch Theme: Dark", safe: true, run: () => applyTheme("dark") },
  { id: "theme:system", title: "Switch Theme: System", safe: true, run: () => applyTheme("system") },
  { id: "theme:contrast", title: "Switch Theme: High Contrast", safe: true, run: () => applyTheme("high-contrast" as ThemeMode) },
  { id: "cleanup:backups", title: "Open Backup Directory", view: "cleanup", safe: true },
  { id: "settings:config-dir", title: "Open App Config Directory", view: "settings", action: "open-config-dir", safe: true },
];

function commands(): PaletteCommand[] {
  return [
    ...workbenchRoutes.map((route) => ({
      id: `view:${route.id}`,
      title: `Go to ${route.label}`,
      view: route.id,
      safe: true,
    })),
    ...actionCommands,
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
      <div class="command-palette__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <input class="command-palette__search" type="search" placeholder="Search commands" aria-label="Search commands" autofocus />
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
                  `<button class="command-palette__item ${index === selected ? "active" : ""}" data-command="${command.id}" role="option" aria-selected="${index === selected ? "true" : "false"}"><span>${command.title}</span><small>${command.safe ? "safe" : "plan only"}</small></button>`,
              )
              .join("")
          : `<div class="command-palette__empty" role="status">No matching commands</div>`;
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
