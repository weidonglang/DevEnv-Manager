import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { DashboardState } from "./state";

export function renderDashboard(state: DashboardState): string {
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
        ${renderObjectTable(state.snapshot, ["rootDir", "devenvHome", "javaHome", "managedRuntimes", "tools"])}
      </section>
    </div>
  `;
}

export function renderHealthCards(state: DashboardState): string {
  return `<div class="metrics">
    ${renderMetric(t("dashboard.rootDirectory"), valueOf(state.snapshot, "rootDir", t("state.notAvailable")), state.errors.snapshot ?? "")}
    ${renderMetric(t("dashboard.discoveredTools"), valueOf(state.snapshot, "tools", t("state.notAvailable")))}
    ${renderPortsMetric(state)}
    ${renderMetric(t("dashboard.pathWarnings"), state.errors.health ? t("state.notAvailable") : state.health.length, state.errors.health ?? "")}
    ${renderMetric(t("dashboard.jdkStatus"), valueOf(state.snapshot, "javaHome", t("state.notAvailable")))}
    ${renderMetric(t("dashboard.pythonStatus"), valueOf(state.snapshot, "python.version", t("state.notAvailable")))}
    ${renderMetric(t("dashboard.powershellRunner"), valueOf(state.powershell, "status", t("state.notAvailable")), state.errors.powershell ?? "")}
    ${renderMetric(t("dashboard.updateStatus"), state.errors.update ? t("state.notAvailable") : valueOf(state.update, "latestVersion", t("state.notChecked")), state.errors.update ?? "")}
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
