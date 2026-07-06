import { escapeHtml, renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import type { PortsWorkbenchState } from "./state";

export function renderPortsWorkbench(state: PortsWorkbenchState): string {
  const rows = state.records.filter((record) =>
    `${valueOf(record, "localPort")} ${valueOf(record, "processName")} ${valueOf(record, "identity")}`.toLowerCase().includes(state.filter.toLowerCase()),
  );
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Ports & Services</h2><p>Diagnose port owners, service identity, risk, confidence, and conflict evidence.</p></div></div>
        <div class="metrics">
          ${renderMetric("Ports", state.records.length)}
          ${renderMetric("Services", state.services.length)}
          ${renderMetric("History", state.history.length)}
          ${renderMetric("Selected", state.selectedPort ?? "None")}
        </div>
        <input id="port-filter" value="${escapeHtml(state.filter)}" placeholder="Filter by port, process, service, or identity" />
        <div class="toolbar">
          ${renderActionButton("scan-ports", "Scan Ports", "primary")}
          ${renderActionButton("create-port-plan", "Create Resolution Plan")}
          ${renderActionButton("execute-port-plan", "Execute Resolution Plan", "danger")}
          ${renderActionButton("inspect-local-services", "Inspect Local Services")}
          ${renderActionButton("stop-local-service", "Stop Local Service", "danger")}
        </div>
      </section>
      <section class="panel">
        <h2>Port table</h2>
        <div class="data-table port-table">
          <div class="data-row head"><span>Port</span><span>Protocol</span><span>State</span><span>PID</span><span>Process</span><span>Risk</span><span>Identity</span><span>Confidence</span><span>Action</span></div>
          ${rows.map(renderPortRow).join("") || `<div class="empty">No port records.</div>`}
        </div>
      </section>
      <section class="panel"><h2>Current plan</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "summary", "recommendation", "targetPid", "targetPort"]) : `<div class="empty">No resolution plan created.</div>`}</section>
    </div>
  `;
}

function renderPortRow(record: unknown): string {
  return `<div class="data-row">
    <span>${escapeHtml(valueOf(record, "localPort"))}</span><span>${escapeHtml(valueOf(record, "protocol"))}</span><span>${escapeHtml(valueOf(record, "state"))}</span>
    <span>${escapeHtml(valueOf(record, "pid"))}</span><span>${escapeHtml(valueOf(record, "processName"))}</span><span>${escapeHtml(valueOf(record, "riskLevel"))}</span>
    <span>${escapeHtml(valueOf(record, "identity"))}</span><span>${escapeHtml(valueOf(record, "confidence"))}</span>
    <span><button data-port-pid="${escapeHtml(valueOf(record, "pid"))}" data-port="${escapeHtml(valueOf(record, "localPort"))}" type="button">Diagnose</button></span>
  </div>`;
}
