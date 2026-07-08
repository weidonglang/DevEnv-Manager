import { escapeHtml, pageItems, renderActionButton, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { PortsWorkbenchState } from "./state";

export function renderPortsWorkbench(state: PortsWorkbenchState): string {
  return `
    <div class="feature-layout">
      ${renderPortsShell(state)}
      <section class="panel" id="ports-table-panel">
        ${renderPortsTable(state)}
      </section>
      <section class="panel"><h2>${t("feature.ports.currentPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "summary", "recommendation", "targetPid", "targetPort"]) : `<div class="empty">${t("feature.ports.noPlan")}</div>`}${state.executionResult ? renderPortExecutionResult(state) : ""}</section>
    </div>
  `;
}

function renderPortExecutionResult(state: PortsWorkbenchState): string {
  const result = state.executionResult;
  if (!result) return "";
  return `<div class="execution-result">
    <h3>${t("feature.ports.executionResult")}</h3>
    ${renderObjectTable(result, ["success", "message", "pidExited", "portReleased", "releaseCheckedAt"])}
    ${result.remainingOwners.length ? `<div class="small-note"><strong>${t("feature.ports.remainingOwners")}</strong><ul>${result.remainingOwners.map((owner) => `<li>${escapeHtml(owner.localPort)} / ${escapeHtml(owner.pid)} / ${escapeHtml(owner.processName)} / ${escapeHtml(owner.identity)}</li>`).join("")}</ul></div>` : ""}
  </div>`;
}

function renderPortsShell(state: PortsWorkbenchState): string {
  return `<section class="panel">
    <div class="panel-head"><div><h2>${t("route.ports.label")}</h2><p>${t("feature.ports.description")}</p></div></div>
    ${renderFeatureGuide("ports")}
    <div class="metrics">
      ${renderMetric(t("feature.ports.ports"), state.records.length)}
      ${renderMetric(t("feature.ports.services"), state.services.length)}
      ${renderMetric(t("feature.ports.history"), state.history.length)}
      ${renderMetric(t("feature.ports.selected"), state.selectedPort ?? t("feature.ports.none"))}
    </div>
    ${renderPortErrors(state)}
    <input id="port-filter" value="${escapeHtml(state.filter)}" placeholder="${t("feature.ports.filter")}" autocomplete="off" />
    <div class="toolbar">
      ${renderActionButton("scan-ports", t("dashboard.scanPorts"), "primary")}
      ${renderActionButton("create-port-plan", t("feature.ports.createPlan"))}
      ${renderActionButton("execute-port-plan", t("feature.ports.executePlan"), "danger")}
      ${renderActionButton("inspect-local-services", t("feature.ports.inspectServices"))}
      ${renderActionButton("stop-local-service", t("feature.ports.stopService"), "danger")}
      ${state.retryPlanRequest ? renderActionButton("retry-port-plan-after-scan", t("feature.ports.rescanAndRetry")) : ""}
    </div>
  </section>`;
}

export function renderPortsTable(state: PortsWorkbenchState): string {
  const rows = state.records.filter((record) =>
    `${valueOf(record, "localPort")} ${valueOf(record, "processName")} ${valueOf(record, "identity")}`.toLowerCase().includes(state.filter.toLowerCase()),
  );
  const page = pageItems(rows, state.page, 10);
  return `
        <h2>${t("feature.ports.table")}</h2>
        <div class="data-table port-table">
          <div class="data-row head"><span>Port</span><span>Protocol</span><span>State</span><span>PID</span><span>Process</span><span>Risk</span><span>Identity</span><span>Confidence</span><span>Action</span></div>
          ${page.items.map(renderPortRow).join("") || `<div class="empty">${t("feature.ports.noRecords")}</div>`}
        </div>
        ${renderPagination("ports", page.page, page.totalPages, page.total)}
  `;
}

function renderPortErrors(state: PortsWorkbenchState): string {
  const messages = [state.scanError, state.historyError, state.servicesError, state.planError].filter(Boolean);
  if (!messages.length) return "";
  return `<div class="error-state">${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>`;
}

function renderPortRow(record: unknown): string {
  return `<div class="data-row">
    <span>${escapeHtml(valueOf(record, "localPort"))}</span><span>${escapeHtml(valueOf(record, "protocol"))}</span><span>${escapeHtml(valueOf(record, "state"))}</span>
    <span>${escapeHtml(valueOf(record, "pid"))}</span><span>${escapeHtml(valueOf(record, "processName"))}</span><span>${escapeHtml(valueOf(record, "riskLevel"))}</span>
    <span>${escapeHtml(valueOf(record, "identity"))}</span><span>${escapeHtml(valueOf(record, "confidence"))}</span>
    <span><button data-port-pid="${escapeHtml(valueOf(record, "pid"))}" data-port="${escapeHtml(valueOf(record, "localPort"))}" type="button">${t("feature.ports.diagnose")}</button></span>
  </div>`;
}
