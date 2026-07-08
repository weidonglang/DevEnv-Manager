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
import { finishDebug, logDebug, setDebugContext } from "../core/debugLog";
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
let currentNavigationId = 0;
let debugCaptureBound = false;
let toastTimer: number | undefined;

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
  const text = String(message ?? "").trim();
  if (!text) {
    logDebug({ type: "toast", name: "suppressed-empty-toast", status: "info", detail: "Suppressed empty toast.", data: { view: readActiveView(), reason: "empty-message", danger } });
    const emptyTarget = document.querySelector<HTMLElement>("#toast");
    if (emptyTarget) {
      emptyTarget.classList.remove("show", "error");
      emptyTarget.textContent = "";
    }
    return;
  }
  logDebug({ type: "toast", name: danger ? "error" : "message", status: danger ? "failed" : "info", detail: text });
  const target = document.querySelector<HTMLElement>("#toast");
  if (!target) return;
  window.clearTimeout(toastTimer);
  target.textContent = text;
  target.classList.add("show");
  target.classList.toggle("error", danger);
  toastTimer = window.setTimeout(() => {
    target.classList.remove("show", "error");
    target.textContent = "";
  }, 3800);
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
  const navigationId = ++currentNavigationId;
  setDebugContext(view, navigationId);
  const navLog = logDebug({ type: "navigation", name: view, view, status: "started", data: { navigationId } });
  const isCurrent = () => navigationId === currentNavigationId && readActiveView() === view;
  setActiveNav(view);
  writeActiveView(view);
  const route = workbenchRoutes.find((item) => item.id === view);
  root.innerHTML = renderLoadingState(t("state.loadingView", { view: route ? routeLabel(route) : view }));
  const context = createFeatureContext({
    root,
    view,
    navigationId,
    isCurrent,
    invoke,
    navigate: navigateTo,
    toast,
    risk: { run: runRiskOperation },
    progress: {
      start: (message: string) => {
        logDebug({ type: "progress", name: message || "start", view, status: "started" });
        toast(message);
      },
      done: (message: string) => {
        logDebug({ type: "progress", name: message || "done", view, status: "success" });
        toast(message);
      },
      fail: (message: string) => {
        logDebug({ type: "progress", name: message || "failed", view, status: "failed" });
        toast(message, true);
      },
    },
  });
  try {
    await module(context);
    if (!isCurrent()) {
      finishDebug(navLog, "staleIgnored", "Feature completed after a newer navigation.");
      return;
    }
    finishDebug(navLog, "success");
  } catch (error) {
    if (!isCurrent()) {
      finishDebug(navLog, "staleIgnored", error instanceof Error ? error.message : String(error));
      return;
    }
    finishDebug(navLog, "failed", error instanceof Error ? error.message : String(error));
    root.innerHTML = renderErrorState(t("state.unableToLoad", { view: route ? routeLabel(route) : view }), error instanceof Error ? error.message : String(error), "retry-active-view");
    root.querySelector("[data-action='retry-active-view']")?.addEventListener("click", () => void mount(view));
    toast(error instanceof Error ? error.message : String(error), true);
  }
}

window.addEventListener("error", (event) => {
  logDebug({ type: "error", name: event.message || "window.error", status: "failed", detail: event.error?.stack || event.message });
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.stack || event.reason.message : String(event.reason);
  logDebug({ type: "error", name: "unhandledrejection", status: "failed", detail: reason });
  toast(t("toast.unexpectedError"), true);
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function bindShellEvents() {
  document.querySelector(".nav")?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-view]") : null;
    const view = button?.dataset.view as WorkbenchView | undefined;
    if (view) {
      logDebug({ type: "click", name: `nav:${view}`, view: readActiveView(), status: "info", data: { targetView: view } });
      void mount(view);
    }
  });
  document.querySelector("#refresh-active-view")?.addEventListener("click", () => {
    logDebug({ type: "click", name: "refresh-active-view", view: readActiveView(), status: "info" });
    void mount(readActiveView());
  });
  document.querySelector("#open-command-palette")?.addEventListener("click", () => {
    logDebug({ type: "click", name: "open-command-palette", view: readActiveView(), status: "info" });
    window.dispatchEvent(new CustomEvent("devenv:open-command-palette"));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-theme-quick]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeQuick === readTheme());
    button.addEventListener("click", () => {
      logDebug({ type: "click", name: "theme-quick", view: readActiveView(), status: "info", data: { theme: button.dataset.themeQuick } });
      applyTheme(button.dataset.themeQuick as ThemeMode);
      document.querySelectorAll<HTMLButtonElement>("[data-theme-quick]").forEach((item) => item.classList.toggle("active", item === button));
      toast(`${t("settings.theme")}: ${button.dataset.themeQuick}`);
    });
  });
  window.addEventListener("devenv:navigate", (event) => {
    const view = (event as CustomEvent<WorkbenchView>).detail;
    if (view) void mount(view);
  });
  window.addEventListener("devenv:action-error", (event) => {
    const message = (event as CustomEvent<string>).detail || t("toast.unexpectedError");
    toast(message, true);
  });
  bindDebugEventCapture();
}

function bindDebugEventCapture() {
  if (debugCaptureBound) return;
  debugCaptureBound = true;
  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || !target.closest("#feature-root")) return;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
    const isSearch = target.type === "search" || target.id.toLowerCase().includes("search") || target.id.toLowerCase().includes("filter");
    logDebug({
      type: isSearch ? "search" : "input",
      name: elementDebugName(target),
      view: readActiveView(),
      status: "info",
      data: { value: summarizeInputValue(target), inputType: target instanceof HTMLInputElement ? target.type : "textarea" },
    });
  }, true);
  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || !target.closest("#feature-root")) return;
    if (target instanceof HTMLSelectElement) {
      logDebug({ type: "filter", name: elementDebugName(target), view: readActiveView(), status: "info", data: { value: target.value } });
      return;
    }
    if (target instanceof HTMLInputElement) {
      logDebug({ type: "change", name: elementDebugName(target), view: readActiveView(), status: "info", data: { checked: target.checked, value: summarizeInputValue(target), inputType: target.type } });
    }
  }, true);
  document.addEventListener("click", (event) => {
    const element = event.target instanceof Element ? event.target : null;
    const pageButton = element?.closest<HTMLElement>("[data-page-action]");
    if (pageButton) {
      logDebug({ type: "pagination", name: pageButton.dataset.pageAction || "pagination", view: readActiveView(), status: "info" });
    }
  }, true);
}

function elementDebugName(element: HTMLElement): string {
  return element.id || element.getAttribute("name") || element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.dataset.action || element.tagName.toLowerCase();
}

function summarizeInputValue(element: HTMLInputElement | HTMLTextAreaElement): string {
  if (element instanceof HTMLInputElement && ["password", "file"].includes(element.type)) return "<redacted>";
  const value = element.value ?? "";
  if (!value) return "";
  return value.length > 160 ? `${value.slice(0, 160)}...` : value;
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
