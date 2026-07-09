import { escapeHtml, pageItems, renderActionButton, renderMetric, renderPagination } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { RuntimeWorkbenchState } from "./state";
import { toRuntimeViewModel, type RuntimeRowViewModel } from "./viewModel";

export function renderRuntimeWorkbench(state: RuntimeWorkbenchState): string {
  const vm = toRuntimeViewModel(state);
  const page = pageItems(vm.rows, state.page, 10);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.runtimes.label")}</h2><p>${t("feature.runtimes.description")}</p></div></div>
        ${renderFeatureGuide("runtimes")}
        <div class="metrics">
          ${renderMetric(t("feature.runtimes.installed"), vm.rows.length)}
          ${renderMetric(t("feature.runtimes.distributions"), state.distributions.length)}
          ${renderMetric(t("feature.runtimes.verification"), vm.verification, vm.verificationDetail)}
        </div>
        ${renderRuntimeInstallGrid(state)}
        ${renderRuntimeOperationResult(state)}
      </section>
      <section class="panel">
        <h2>${t("feature.runtimes.installedVersions")}</h2>
        <div class="runtime-list" data-testid="runtime-installed-list">
          ${page.items.map(renderRuntimeRow).join("") || `<div class="empty">${t("feature.runtimes.empty")}</div>`}
        </div>
        ${renderPagination("runtimes", page.page, page.totalPages, page.total)}
      </section>
      ${renderRuntimeDetails(vm.rows.find((row) => row.id === state.selectedRuntimeId) ?? null)}
    </div>
  `;
}

function renderRuntimeOperationResult(state: RuntimeWorkbenchState): string {
  return `<div data-testid="runtime-operation-result">
    ${state.operationError ? `<div class="error-state">${escapeHtml(state.operationError)}</div>` : ""}
    ${state.operationResult ? `<div class="small-note">${escapeHtml(state.operationResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}
  </div>`;
}

function renderRuntimeInstallGrid(state: RuntimeWorkbenchState): string {
  return `<div class="runtime-install-grid">
    <article class="runtime-install-card" data-testid="runtime-install-jdk-group">
      <div><strong>JDK</strong><span>Temurin / Microsoft / Zulu</span></div>
      <select id="jdk-distribution" data-testid="runtime-jdk-distribution-select">${state.distributions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.recommended ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("") || `<option value="temurin">Temurin</option>`}</select>
      <select id="jdk-version" data-testid="runtime-jdk-version-select">${["8", "11", "17", "21", "25"].map((version) => `<option value="${version}" ${version === "21" ? "selected" : ""}>JDK ${version}</option>`).join("")}</select>
      ${renderActionButton("install-jdk", t("feature.runtimes.installJdk"))}
    </article>
    ${renderVersionInstallCard("Node.js", "runtime-install-node-group", "node-version", "runtime-node-version-select", ["16", "18", "20", "22", "24"], "22", "install-node", t("feature.runtimes.installNode"))}
    ${renderVersionInstallCard("Python", "runtime-install-python-group", "python-version", "runtime-python-version-select", ["3.9", "3.10", "3.11", "3.12", "3.13", "3.14"], "3.12", "install-python", t("feature.runtimes.installPython"))}
    ${renderVersionInstallCard("Go", "runtime-install-go-group", "go-version", "runtime-go-version-select", ["1.22", "1.23", "1.24", "1.25", "1.26"], "1.25", "install-go", t("feature.runtimes.installGo"))}
    ${renderLatestInstallCard("Maven", "runtime-install-maven-group", "install-maven", t("feature.runtimes.installMaven"))}
    ${renderLatestInstallCard("Gradle", "runtime-install-gradle-group", "install-gradle", t("feature.runtimes.installGradle"))}
    <article class="runtime-install-card runtime-install-card--actions">
      <div><strong>${t("feature.runtimes.installedVersions")}</strong><span>${t("feature.runtimes.verification")}</span></div>
      ${renderActionButton("refresh-runtimes", t("feature.runtimes.discover"), "primary")}
      ${renderActionButton("verify-runtimes", t("feature.runtimes.healthCheck"))}
    </article>
  </div>`;
}

function renderVersionInstallCard(title: string, testId: string, selectId: string, selectTestId: string, versions: string[], selected: string, action: string, label: string): string {
  return `<article class="runtime-install-card" data-testid="${escapeHtml(testId)}">
    <div><strong>${escapeHtml(title)}</strong><span>${t("feature.runtimes.managedVersion", { version: selected })}</span></div>
    <select id="${escapeHtml(selectId)}" data-testid="${escapeHtml(selectTestId)}">${versions.map((version) => `<option value="${version}" ${version === selected ? "selected" : ""}>${escapeHtml(title)} ${version}</option>`).join("")}</select>
    ${renderActionButton(action, label)}
  </article>`;
}

function renderLatestInstallCard(title: string, testId: string, action: string, label: string): string {
  return `<article class="runtime-install-card" data-testid="${escapeHtml(testId)}">
    <div><strong>${escapeHtml(title)}</strong><span>${t("feature.runtimes.latestManaged")}</span></div>
    ${renderActionButton(action, label)}
  </article>`;
}

function renderRuntimeRow(runtime: RuntimeRowViewModel): string {
  return `<article class="runtime" data-runtime-row="${escapeHtml(runtime.id)}">
    <div><strong>${escapeHtml(runtime.kind)} ${escapeHtml(runtime.version)}</strong><span>${escapeHtml(runtime.runtimeRoot)}</span></div>
    <small>${t("feature.runtimes.executable")}: ${escapeHtml(runtime.executable)} - ${t("feature.runtimes.source")}: ${escapeHtml(runtime.source)} - ${escapeHtml(runtime.current)} - ${escapeHtml(runtime.status)}</small>
    <div class="row-actions">${runtime.managed ? renderManagedActions(runtime) : renderExternalActions(runtime)}</div>
  </article>`;
}

function renderManagedActions(runtime: RuntimeRowViewModel): string {
  return `<span class="status-badge status-badge--success">${escapeHtml(runtime.readonlyLabel)}</span>${runtimeAction("details", runtime, t("feature.runtimes.details"))}${runtimeAction("health", runtime, t("feature.runtimes.healthCheck"))}${runtimeAction("open", runtime, t("feature.runtimes.openDir"))}${runtimeAction("copy", runtime, t("feature.runtimes.copyPath"))}${runtimeAction("switch", runtime, t("feature.runtimes.switch"))}${runtimeAction("uninstall", runtime, t("feature.runtimes.uninstall"), "danger")}`;
}

function renderExternalActions(runtime: RuntimeRowViewModel): string {
  return `<span class="status-badge">${escapeHtml(runtime.readonlyLabel)}</span>${runtimeAction("details", runtime, t("feature.runtimes.details"))}${runtimeAction("open", runtime, t("feature.runtimes.openDir"))}${runtimeAction("copy", runtime, t("feature.runtimes.copyPath"))}${runtimeAction("system", runtime, t("feature.runtimes.systemUninstall"))}`;
}

function runtimeAction(action: "copy" | "switch" | "uninstall" | "open" | "health" | "details" | "system", runtime: RuntimeRowViewModel, label: string, tone = "secondary"): string {
  return `<button class="button button--${tone} ${tone}" data-runtime-action="${action}" data-runtime-kind="${escapeHtml(runtime.backendKind)}" data-runtime-label="${escapeHtml(runtime.kind)}" data-runtime-version="${escapeHtml(runtime.version)}" data-runtime-path="${escapeHtml(runtime.runtimeRoot)}" data-runtime-executable="${escapeHtml(runtime.executable)}" type="button">${escapeHtml(label)}</button>`;
}

function renderRuntimeDetails(runtime: RuntimeRowViewModel | null): string {
  if (!runtime) return "";
  return `<section class="panel runtime-detail-panel">
    <div class="panel-head"><div><h2>${t("feature.runtimes.details")}</h2><p>${escapeHtml(runtime.kind)} ${escapeHtml(runtime.version)}</p></div></div>
    <dl class="kv-list">
      <div><dt>${t("feature.runtimes.kind")}</dt><dd>${escapeHtml(runtime.kind)}</dd></div>
      <div><dt>${t("feature.runtimes.version")}</dt><dd>${escapeHtml(runtime.version)}</dd></div>
      <div><dt>${t("feature.runtimes.source")}</dt><dd>${escapeHtml(runtime.source)}</dd></div>
      <div><dt>${t("feature.runtimes.status")}</dt><dd>${escapeHtml(runtime.status)}</dd></div>
      <div><dt>${t("feature.runtimes.current")}</dt><dd>${escapeHtml(runtime.current)}</dd></div>
      <div><dt>${t("feature.runtimes.root")}</dt><dd>${escapeHtml(runtime.runtimeRoot)}</dd></div>
      <div><dt>${t("feature.runtimes.executable")}</dt><dd>${escapeHtml(runtime.executable)}</dd></div>
    </dl>
  </section>`;
}
