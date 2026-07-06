import { invoke } from "../core/invoke";
import { disclaimerPanel } from "../components/disclaimerPanel";
import { subscribeLocaleChange, t } from "../core/i18n";
import { runRiskOperation } from "../core/risk";
import type { ConfigView, OperationResult } from "../types";
import { navigateTo, routeDescription, routeLabel, workbenchRoutes } from "./router";
import { readActiveView, writeActiveView, type WorkbenchView } from "./state";
import { createFeatureContext, type FeatureModule } from "./featureContext";
import { renderErrorState, renderLoadingState } from "../features/sharedView";
import { applyTheme, readTheme, type ThemeMode } from "../ui/theme/controller";
import { mountDashboardFeature } from "../features/dashboard";
import { mountRuntimesFeature } from "../features/runtimes";
import { mountEnvironmentFeature } from "../features/environment";
import { mountProjectsFeature } from "../features/projects";
import { mountPortsFeature } from "../features/ports";
import { mountFileAssociationsFeature } from "../features/fileAssociations";
import { mountCleanupFeature } from "../features/cleanup";
import { mountToolchainsFeature } from "../features/toolchains";
import { mountProfilesFeature } from "../features/profiles";
import { mountReportsFeature } from "../features/reports";
import { mountSettingsFeature } from "../features/settings";

const app = document.querySelector<HTMLDivElement>("#app");
let workbenchStarted = false;

const modules: Record<WorkbenchView, FeatureModule> = {
  dashboard: mountDashboardFeature,
  runtimes: mountRuntimesFeature,
  environment: mountEnvironmentFeature,
  projects: mountProjectsFeature,
  ports: mountPortsFeature,
  fileAssociations: mountFileAssociationsFeature,
  cleanup: mountCleanupFeature,
  toolchains: mountToolchainsFeature,
  profiles: mountProfilesFeature,
  reports: mountReportsFeature,
  settings: mountSettingsFeature,
};

if (!app) {
  throw new Error("Missing app root");
}

function icon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12 4.5 7.8M12 12l7.5-4.2M12 12v8.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

function renderShell() {
  if (!app) return;
  app.innerHTML = `
    <main class="shell fluent-shell">
      <aside class="sidebar fluent-sidebar">
        <div class="brand">
          <div class="brand-mark">${icon()}</div>
          <div><strong>DevEnv Manager</strong><span>${t("app.brandWorkbench")}</span></div>
        </div>
        <nav class="nav" aria-label="Workbench">
          ${workbenchRoutes
            .map(
              (route) => `
                <button class="nav-item" data-view="${route.id}">
                  <span class="nav-icon" aria-hidden="true">${route.icon}</span>
                  <span>${routeLabel(route)}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
      </aside>
      <section class="workspace fluent-workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">${t("app.localWorkbench")}</p>
            <h1 id="view-title">${t("route.dashboard.label")}</h1>
            <p id="view-description">${t("route.dashboard.description")}</p>
          </div>
          <div class="toolbar compact">
            <button id="open-command-palette" class="button button--primary primary" type="button">${t("app.commandPalette")}</button>
            <button id="refresh-active-view" class="button button--secondary" type="button">${t("app.refresh")}</button>
            <div class="theme-switcher" aria-label="${t("app.theme")}">
              ${(["light", "dark", "system", "high-contrast"] as const)
                .map((mode) => `<button class="icon-button" data-theme-quick="${mode}" type="button" aria-label="Theme ${mode}">${themeLabel(mode)}</button>`)
                .join("")}
            </div>
          </div>
        </header>
        <section id="feature-root" class="view active" aria-live="polite"></section>
        <footer class="workbench-statusbar">
          <span id="workbench-status-view">${t("route.dashboard.label")}</span>
          <span>${t("app.statusRelease")}</span>
          <span>${t("app.riskStatus")}</span>
        </footer>
      </section>
    </main>
    <div id="toast" class="toast" role="status"></div>
  `;
}

function renderSafetyGate(message = "") {
  if (!app) return;
  app.innerHTML = `
    <main class="shell safety-shell">
      <section class="workspace fluent-workspace">
        <section class="view active">
          ${message ? renderErrorState(t("state.unableToLoad", { view: t("settings.safetyNotice") }), message, "retry-safety-gate") : ""}
          ${disclaimerPanel(true)}
        </section>
      </section>
    </main>
    <div id="toast" class="toast" role="status"></div>
  `;
  document.querySelector("#accept-safety-disclaimer")?.addEventListener("click", () => {
    void acceptSafetyGate();
  });
  document.querySelector("[data-action='retry-safety-gate']")?.addEventListener("click", () => {
    void startApp();
  });
}

function themeLabel(mode: ThemeMode) {
  return ({ light: "L", dark: "D", system: "S", "high-contrast": "HC" } as Record<ThemeMode, string>)[mode];
}

function toast(message: string, danger = false) {
  const target = document.querySelector<HTMLElement>("#toast");
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("show", Boolean(message));
  target.classList.toggle("error", danger);
  window.setTimeout(() => target.classList.remove("show"), 3800);
}

function setActiveNav(view: WorkbenchView) {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-view]")) {
    button.classList.toggle("active", button.dataset.view === view);
  }
  const title = document.querySelector<HTMLElement>("#view-title");
  const description = document.querySelector<HTMLElement>("#view-description");
  const status = document.querySelector<HTMLElement>("#workbench-status-view");
  const route = workbenchRoutes.find((item) => item.id === view);
  if (title && route) {
    title.textContent = routeLabel(route);
  }
  if (description && route) {
    description.textContent = routeDescription(route);
  }
  if (status && route) {
    status.textContent = routeLabel(route);
  }
}

async function mount(view: WorkbenchView) {
  const root = document.querySelector<HTMLElement>("#feature-root");
  const module = modules[view];
  if (!root || !module) return;
  setActiveNav(view);
  writeActiveView(view);
  const route = workbenchRoutes.find((item) => item.id === view);
  root.innerHTML = renderLoadingState(t("state.loadingView", { view: route ? routeLabel(route) : view }));
  const context = createFeatureContext({
    root,
    invoke,
    navigate: navigateTo,
    toast,
    risk: { run: runRiskOperation },
    progress: {
      start: (message: string) => toast(message),
      done: (message: string) => toast(message),
      fail: (message: string) => toast(message, true),
    },
  });
  try {
    await module(context);
  } catch (error) {
    root.innerHTML = renderErrorState(t("state.unableToLoad", { view: route ? routeLabel(route) : view }), error instanceof Error ? error.message : String(error), "retry-active-view");
    root.querySelector("[data-action='retry-active-view']")?.addEventListener("click", () => void mount(view));
    toast(error instanceof Error ? error.message : String(error), true);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function bindShellEvents() {
  document.querySelector(".nav")?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-view]") : null;
    const view = button?.dataset.view as WorkbenchView | undefined;
    if (view) void mount(view);
  });
  document.querySelector("#refresh-active-view")?.addEventListener("click", () => {
    void mount(readActiveView());
  });
  document.querySelector("#open-command-palette")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:open-command-palette"));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-theme-quick]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeQuick === readTheme());
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeQuick as ThemeMode);
      document.querySelectorAll<HTMLButtonElement>("[data-theme-quick]").forEach((item) => item.classList.toggle("active", item === button));
      toast(`${t("settings.theme")}: ${button.dataset.themeQuick}`);
    });
  });
  window.addEventListener("devenv:navigate", (event) => {
    const view = (event as CustomEvent<WorkbenchView>).detail;
    if (view) void mount(view);
  });
}

subscribeLocaleChange(() => {
  if (workbenchStarted) {
    startWorkbench();
  } else {
    renderSafetyGate();
  }
});
void startApp();

async function startApp() {
  try {
    const config = await invoke<ConfigView>("load_config");
    if (!config.settings.safetyDisclaimerAccepted) {
      renderSafetyGate();
      return;
    }
    startWorkbench();
  } catch (error) {
    renderSafetyGate(error instanceof Error ? error.message : String(error));
  }
}

function startWorkbench() {
  workbenchStarted = true;
  renderShell();
  bindShellEvents();
  void mount(readActiveView());
}

async function acceptSafetyGate() {
  try {
    await invoke<OperationResult>("accept_safety_disclaimer");
    startWorkbench();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), true);
  }
}
