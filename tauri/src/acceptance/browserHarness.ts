import "../styles.css";
import "../ui/theme/tokens.css";
import "../ui/theme/light.css";
import "../ui/theme/dark.css";
import "../ui/theme/high-contrast.css";

import { setLocale, t, type LocaleMode } from "../core/i18n";
import { workbenchRoutes, routeDescription, routeLabel } from "../app/router";
import { renderDashboard } from "../features/dashboard/render";
import { renderCleanupWorkbench } from "../features/cleanup/render";
import { renderEnvironmentWorkbench } from "../features/environment/render";
import { renderFileAssociations } from "../features/fileAssociations/render";
import { normalizePortRecords } from "../features/ports/portGroups";
import { renderPortsWorkbench } from "../features/ports/render";
import { renderRuntimeWorkbench } from "../features/runtimes/render";
import { renderProjectWorkbench } from "../features/projects/render";
import { renderProfilesWorkbench } from "../features/profiles/render";
import { renderSettingsWorkbench } from "../features/settings/render";
import { renderToolchainWorkbench } from "../features/toolchains/render";
import { applyTheme, type ThemeMode } from "../ui/theme/controller";
import { acceptanceFixtures } from "./fixtures";
import type { CleanupWorkbenchState } from "../features/cleanup/state";
import type { PortsWorkbenchState } from "../features/ports/state";
import type { PortRecord } from "../types";
import { dashboardVisualState, environmentVisualState, profilesVisualState, projectVisualState, settingsVisualState } from "./visualFixtures";

type VisualPage = "dashboard" | "cleanup" | "environment" | "projects" | "ports" | "profiles" | "runtimes" | "fileAssociations" | "settings" | "toolchains";
type VisualVariant = "default" | "planned" | "result" | "archive-folder" | "advanced";

declare global {
  interface Window {
    __DEVENV_VISUAL_READY__?: boolean;
    __DEVENV_VISUAL_CONTEXT__?: Record<string, string>;
  }
}

const params = new URLSearchParams(window.location.search);
const page = readPage(params.get("page"));
const theme = readTheme(params.get("theme"));
const locale = readLocale(params.get("locale"));
const variant = readVariant(params.get("variant"));

setLocale(locale);
applyTheme(theme);
document.documentElement.lang = locale;
document.body.dataset.visualAcceptance = "true";
document.body.dataset.visualPage = page;
document.body.dataset.visualVariant = variant;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing visual acceptance app root");

const route = workbenchRoutes.find((candidate) => candidate.id === page);
if (!route) throw new Error(`No workbench route for ${page}`);

app.innerHTML = renderShell(page, routeLabel(route), routeDescription(route));
const featureRoot = document.querySelector<HTMLElement>("#feature-root");
if (!featureRoot) throw new Error("Missing visual acceptance feature root");
featureRoot.innerHTML = renderPage(page, variant);

window.__DEVENV_VISUAL_CONTEXT__ = { page, theme, locale, variant };
window.__DEVENV_VISUAL_READY__ = true;

function renderShell(activePage: VisualPage, title: string, description: string): string {
  return `<main class="shell fluent-shell" data-testid="visual-acceptance-shell">
    <aside class="sidebar fluent-sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">DM</div>
        <div><strong>DevEnv Manager</strong><span>${t("app.brandWorkbench")}</span></div>
      </div>
      <nav class="nav" aria-label="Workbench">
        ${workbenchRoutes.map((candidate) => `<button class="nav-item ${candidate.id === activePage ? "active" : ""}" type="button"><span class="nav-icon" aria-hidden="true">${candidate.icon}</span><span>${routeLabel(candidate)}</span></button>`).join("")}
      </nav>
    </aside>
    <section class="workspace fluent-workspace">
      <header class="topbar">
        <div><p class="eyebrow">${t("app.localWorkbench")}</p><h1>${title}</h1><p>${description}</p></div>
        <div class="toolbar compact">
          <button class="button button--primary primary" type="button">${t("app.commandPalette")}</button>
          <button class="button button--secondary" type="button">${t("app.refresh")}</button>
          <div class="theme-switcher" aria-label="${t("app.theme")}">
            <button class="icon-button" type="button">L</button><button class="icon-button" type="button">D</button><button class="icon-button" type="button">S</button><button class="icon-button active" type="button">HC</button>
          </div>
        </div>
      </header>
      <section id="feature-root" class="view active" aria-live="polite" data-testid="global-persistent-result"></section>
      <footer class="workbench-statusbar"><span>${title}</span><span>visual acceptance</span><span>${t("app.riskStatus")}</span></footer>
    </section>
  </main>`;
}

function renderPage(target: VisualPage, targetVariant: VisualVariant): string {
  if (target === "dashboard") return renderDashboard(dashboardVisualState());
  if (target === "cleanup") return renderCleanupWorkbench(cleanupState(targetVariant));
  if (target === "environment") return renderEnvironmentWorkbench(environmentVisualState());
  if (target === "projects") return renderProjectWorkbench(projectVisualState());
  if (target === "ports") return renderPortsWorkbench(portsState());
  if (target === "profiles") return renderProfilesWorkbench(profilesVisualState());
  if (target === "runtimes") return renderRuntimeWorkbench(structuredClone(acceptanceFixtures.runtimes));
  if (target === "fileAssociations") return renderFileAssociations(structuredClone(acceptanceFixtures.fileAssociations));
  if (target === "settings") return renderSettingsWorkbench(settingsVisualState(theme));
  return renderToolchainWorkbench(structuredClone(acceptanceFixtures.toolchains));
}

function cleanupState(targetVariant: VisualVariant): CleanupWorkbenchState {
  const state = structuredClone(acceptanceFixtures.cleanup);
  if (targetVariant === "advanced") {
    state.activeView = "advanced";
    return state;
  }
  if (targetVariant === "archive-folder") {
    state.activeView = "space";
    state.desktopTargetDrive = "D:\\ReleaseLab\\ArchiveTarget";
    state.desktopArchivePlan = {
      planId: "desktop-archive-i18n-fixture",
      createdAt: "2026-07-22T08:00:00Z",
      source: "C:\\Users\\Acceptance\\Desktop",
      target: "D:\\ReleaseLab\\ArchiveTarget\\DesktopArchive",
      mode: "desktop_archive",
      estimatedBytes: 2048,
      itemCount: 1,
      risk: "high",
      requiresAdmin: false,
      reversible: true,
      selectedItems: [],
      warnings: [
        "执行时会再次校验桌面边界、文件大小和源文件 SHA-256",
        "目标冲突使用计划中预览的唯一文件名，不覆盖现有文件",
      ],
    };
    return state;
  }
  if (targetVariant === "default") return state;
  state.recycleBinSelectedDrives = ["D:"];
  state.recycleBinPlan = {
    planId: "recycle-bin-acceptance-plan",
    createdAt: "2026-07-22T07:30:00Z",
    selectedDrives: ["D:"],
    itemIds: ["fixture-recycle-item"],
    itemCount: 1,
    estimatedBytes: 4096,
    snapshotFingerprint: "fixture-recycle-bin-snapshot-fingerprint",
    riskLevel: "critical",
    warnings: ["permanent-removal", "scope-by-volume", "snapshot-must-match"],
  };
  state.recycleBinOperationMessage = "Snapshot-based Recycle Bin plan is ready for volume-scope confirmation.";
  if (targetVariant === "planned") return state;
  state.recycleBinPlan = null;
  state.recycleBinResult = {
    planId: "recycle-bin-acceptance-plan",
    success: true,
    beforeItemCount: 1,
    beforeBytes: 4096,
    afterItemCount: 0,
    afterBytes: 0,
    cleanedItems: 1,
    cleanedBytes: 4096,
    selectedDrives: ["D:"],
    failures: [],
    message: "Recycle Bin cleanup verified by a fresh scan.",
  };
  state.recycleBinOperationMessage = "Cleanup completed and the selected volume was re-scanned.";
  return state;
}

function portsState(): PortsWorkbenchState {
  const state = structuredClone(acceptanceFixtures.ports);
  const seed = state.records[state.records.length - 1];
  const synthetic = [
    portVariant(seed, "UDP", 4500, 7000, "0.0.0.0", "port-fixture-udp-4500-v4"),
    portVariant(seed, "UDP", 4500, 7000, "::", "port-fixture-udp-4500-v6"),
    portVariant(seed, "TCP", 5043, 7100, "0.0.0.0", "port-fixture-tcp-5043-v4"),
    portVariant(seed, "TCP", 5043, 7100, "::", "port-fixture-tcp-5043-v6"),
  ];
  const normalized = normalizePortRecords([...state.records, ...synthetic], {
    source: "visual-acceptance-fixture",
    generation: 1,
    cached: false,
    stage: "enrichment",
  });
  state.records = normalized.records;
  state.groupDiagnostics = normalized.diagnostics;
  if (state.snapshot) state.snapshot.records = normalized.records;
  return state;
}

function portVariant(seed: PortRecord, protocol: string, port: number, pid: number, address: string, groupId: string): PortRecord {
  const endpoint = address === "::" ? `[::]:${port}` : `${address}:${port}`;
  return {
    ...structuredClone(seed),
    groupId,
    groupFingerprint: `${protocol.toLowerCase()}-${port}-${pid}`,
    protocol,
    localAddress: address,
    localPort: port,
    pid,
    processName: port === 4500 ? "svchost.exe" : "node.exe",
    processPath: port === 4500 ? "C:\\Windows\\System32\\svchost.exe" : "C:\\Program Files\\nodejs\\node.exe",
    processStartTime: 1784213400,
    state: protocol === "UDP" ? "LISTENING" : "LISTENING",
    bindings: [{ localAddress: address, localEndpoint: endpoint, remoteEndpoint: "*", state: "LISTENING" }],
    bindingCount: 1,
    hasIpv4: address !== "::",
    hasIpv6: address === "::",
  };
}

function readPage(value: string | null): VisualPage {
  if (value === "dashboard" || value === "cleanup" || value === "environment" || value === "projects" || value === "ports" || value === "profiles" || value === "runtimes" || value === "fileAssociations" || value === "settings" || value === "toolchains") return value;
  return "cleanup";
}

function readTheme(value: string | null): ThemeMode {
  if (value === "light" || value === "dark" || value === "system" || value === "high-contrast") return value;
  return "light";
}

function readLocale(value: string | null): Exclude<LocaleMode, "auto"> {
  return value === "zh-CN" ? "zh-CN" : "en-US";
}

function readVariant(value: string | null): VisualVariant {
  if (value === "planned" || value === "result" || value === "archive-folder" || value === "advanced") return value;
  return "default";
}
