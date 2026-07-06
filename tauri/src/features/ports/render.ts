import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { PortsWorkbenchState } from "./state";

export function renderPortsWorkbench(state: PortsWorkbenchState): string {
  const rows = state.records.filter((record) =>
    `${valueOf(record, "localPort")} ${valueOf(record, "processName")} ${valueOf(record, "identity")}`.toLowerCase().includes(state.filter.toLowerCase()),
  );
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.ports.label")}</h2><p>${t("feature.ports.description")}</p></div></div>
        ${renderFeatureGuide("ports")}
        <div class="metrics">
          ${renderMetric(t("feature.ports.ports"), state.records.length)}
          ${renderMetric(t("feature.ports.services"), state.services.length)}
          ${renderMetric(t("feature.ports.history"), state.history.length)}
          ${renderMetric(t("feature.ports.selected"), state.selectedPort ?? t("feature.ports.none"))}
        </div>
        <input id="port-filter" value="${escapeHtml(state.filter)}" placeholder="${t("feature.ports.filter")}" />
        <div class="toolbar">
          ${renderActionButton("scan-ports", t("dashboard.scanPorts"), "primary")}
          ${renderActionButton("create-port-plan", t("feature.ports.createPlan"))}
          ${renderActionButton("execute-port-plan", t("feature.ports.executePlan"), "danger")}
          ${renderActionButton("inspect-local-services", t("feature.ports.inspectServices"))}
          ${renderActionButton("stop-local-service", t("feature.ports.stopService"), "danger")}
        </div>
      </section>
      <section class="panel">
        <h2>${t("feature.ports.table")}</h2>
        <div class="data-table port-table">
          <div class="data-row head"><span>Port</span><span>Protocol</span><span>State</span><span>PID</span><span>Process</span><span>Risk</span><span>Identity</span><span>Confidence</span><span>Action</span></div>
          ${rows.map(renderPortRow).join("") || `<div class="empty">${t("feature.ports.noRecords")}</div>`}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.ports.currentPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "summary", "recommendation", "targetPid", "targetPort"]) : `<div class="empty">${t("feature.ports.noPlan")}</div>`}</section>
    </div>
  `;
}

function renderPortRow(record: unknown): string {
  return `<div class="data-row">
    <span>${escapeHtml(valueOf(record, "localPort"))}</span><span>${escapeHtml(valueOf(record, "protocol"))}</span><span>${escapeHtml(valueOf(record, "state"))}</span>
    <span>${escapeHtml(valueOf(record, "pid"))}</span><span>${escapeHtml(valueOf(record, "processName"))}</span><span>${escapeHtml(valueOf(record, "riskLevel"))}</span>
    <span>${escapeHtml(valueOf(record, "identity"))}</span><span>${escapeHtml(valueOf(record, "confidence"))}</span>
    <span><button data-port-pid="${escapeHtml(valueOf(record, "pid"))}" data-port="${escapeHtml(valueOf(record, "localPort"))}" type="button">${t("feature.ports.diagnose")}</button></span>
  </div>`;
}
