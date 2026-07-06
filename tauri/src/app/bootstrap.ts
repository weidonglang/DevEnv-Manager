import { invoke } from "../core/invoke";
import { runRiskOperation } from "../core/risk";
import { navigateTo, workbenchRoutes } from "./router";
import { readActiveView, writeActiveView, type WorkbenchView } from "./state";
import { createFeatureContext, type FeatureModule } from "./featureContext";
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
          <div><strong>DevEnv Manager</strong><span>Workbench</span></div>
        </div>
        <nav class="nav" aria-label="Workbench">
          ${workbenchRoutes
            .map(
              (route) => `
                <button class="nav-item" data-view="${route.id}">
                  <span>${route.label}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
      </aside>
      <section class="workspace fluent-workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Local environment workbench</p>
            <h1 id="view-title">Dashboard</h1>
          </div>
          <div class="toolbar compact">
            <button id="open-command-palette" type="button">Command Palette</button>
            <button id="refresh-active-view" type="button">Refresh</button>
          </div>
        </header>
        <section id="feature-root" class="view active" aria-live="polite"></section>
      </section>
    </main>
    <div id="toast" class="toast" role="status"></div>
  `;
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
  const route = workbenchRoutes.find((item) => item.id === view);
  if (title && route) {
    title.textContent = route.label;
  }
}

async function mount(view: WorkbenchView) {
  const root = document.querySelector<HTMLElement>("#feature-root");
  const module = modules[view];
  if (!root || !module) return;
  setActiveNav(view);
  writeActiveView(view);
  root.innerHTML = `<div class="loading">Loading ${view}...</div>`;
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
    root.innerHTML = `<section class="panel"><h2>Unable to load ${view}</h2><p>${escapeHtml(String(error))}</p></section>`;
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
  window.addEventListener("devenv:navigate", (event) => {
    const view = (event as CustomEvent<WorkbenchView>).detail;
    if (view) void mount(view);
  });
}

renderShell();
bindShellEvents();
void mount(readActiveView());
