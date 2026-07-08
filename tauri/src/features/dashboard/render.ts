import { escapeHtml, renderActionButton, renderMetric } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { DashboardState } from "./state";
import { toDashboardViewModel } from "./viewModel";

export function renderDashboard(state: DashboardState): string {
  const vm = toDashboardViewModel(state);
  return `
    <div class="feature-layout dashboard-view">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("dashboard.title")}</h2><p>${t("dashboard.description")}</p></div></div>
        ${renderFeatureGuide("dashboard")}
        ${renderHealthCards(state)}
        ${renderQuickActions()}
      </section>
      <section class="panel">
        <h2>${t("dashboard.environmentSummary")}</h2>
        ${renderDashboardRows(vm.environmentRows)}
      </section>
    </div>
  `;
}

export function renderHealthCards(state: DashboardState): string {
  const vm = toDashboardViewModel(state);
  return `<div class="metrics">
    ${renderMetric(t("dashboard.rootDirectory"), vm.rootDirectory, state.errors.snapshot ?? "")}
    ${renderMetric(t("dashboard.discoveredTools"), vm.discoveredTools)}
    ${renderPortsMetric(state)}
    ${renderMetric(t("dashboard.pathWarnings"), vm.pathWarnings, vm.pathWarningsDetail)}
    ${renderMetric(t("dashboard.jdkStatus"), vm.jdkStatus, vm.jdkDetail)}
    ${renderMetric(t("dashboard.pythonStatus"), vm.pythonStatus, vm.pythonDetail)}
    ${renderMetric(t("dashboard.powershellRunner"), vm.powershellRunner, vm.powershellDetail)}
    ${renderMetric(t("dashboard.updateStatus"), vm.updateStatus, vm.updateDetail)}
  </div>`;
}

export function renderQuickActions(): string {
  return `<div class="toolbar dashboard-actions">
    ${renderActionButton("run-doctor", t("dashboard.runDoctor"), "primary")}
    ${renderActionButton("inspect-environment", t("dashboard.inspectEnvironment"))}
    ${renderActionButton("scan-ports", t("dashboard.scanPorts"))}
    ${renderActionButton("retry-ports-only", t("dashboard.retryPortsOnly"))}
    ${renderActionButton("search-file-association-app", t("dashboard.searchFileAssociationApp"))}
    ${renderActionButton("create-java-stabilize-plan", t("dashboard.createJavaStabilizePlan"))}
    ${renderActionButton("check-updates", t("dashboard.checkUpdates"))}
    ${renderActionButton("export-report", t("dashboard.exportReport"))}
  </div>`;
}

function renderPortsMetric(state: DashboardState): string {
  if (state.errors.ports) {
    return renderMetric(t("dashboard.portScanTimedOut"), t("state.notAvailable"), `${t("dashboard.portSummaryUnavailable")} ${t("dashboard.openPortsToRetry")}`);
  }
  if (state.portStatus === "cached") {
    return renderMetric(t("dashboard.portRecords"), state.ports.length);
  }
  return renderMetric(t("dashboard.portRecords"), t("dashboard.portsNotScanned"), t("dashboard.portsNotScannedDetail"));
}

function renderDashboardRows(rows: Array<{ label: string; value: string }>): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("")}</dl>`;
}
