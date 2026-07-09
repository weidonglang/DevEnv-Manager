import type { PortRecord } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import { assessPortTreatability, portRecordKey, selectedPortRecord } from "./portSafety";
import type { PortsWorkbenchState } from "./state";

export function renderPortsWorkbench(state: PortsWorkbenchState): string {
  return `
    <div class="feature-layout">
      ${renderPortsShell(state)}
      <section class="panel" id="ports-table-panel">
        ${renderPortsTable(state)}
      </section>
      <section class="panel">
        ${renderSelectedPortDetail(state)}
      </section>
      <section class="panel" id="ports-plan-panel"><h2>${t("feature.ports.currentPlan")}</h2>${renderPortPlan(state)}${state.executionResult ? renderPortExecutionResult(state) : ""}</section>
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
  const selected = selectedPortRecord(state.records, state.selectedKey);
  return `<section class="panel">
    <div class="panel-head"><div><h2>${t("route.ports.label")}</h2><p>${t("feature.ports.description")}</p></div></div>
    ${renderFeatureGuide("ports")}
    <div class="metrics">
      ${renderMetric(t("feature.ports.ports"), state.records.length)}
      ${renderMetric(t("feature.ports.services"), state.services.length)}
      ${renderMetric(t("feature.ports.history"), state.history.length)}
      ${renderMetric(t("feature.ports.selected"), selected ? `${selected.localPort} / PID ${selected.pid}` : t("feature.ports.none"))}
    </div>
    ${renderPortErrors(state)}
    <input id="port-filter" value="${escapeHtml(state.filter)}" placeholder="${t("feature.ports.filter")}" autocomplete="off" />
    <div class="toolbar">
      ${renderActionButton("scan-ports", t("dashboard.scanPorts"), "primary")}
      ${renderActionButton("create-port-plan", t("feature.ports.createPlanForSelected"))}
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
          <div class="data-row head"><span>${t("feature.ports.select")}</span><span>${t("feature.ports.port")}</span><span>${t("feature.ports.protocol")}</span><span>${t("feature.ports.state")}</span><span>PID</span><span>${t("feature.ports.process")}</span><span>${t("feature.ports.risk")}</span><span>${t("feature.ports.identity")}</span><span>${t("feature.ports.confidence")}</span></div>
          ${page.items.map((record) => renderPortRow(record, state.selectedKey)).join("") || `<div class="empty">${t("feature.ports.noRecords")}</div>`}
        </div>
        ${renderPagination("ports", page.page, page.totalPages, page.total)}
  `;
}

function renderPortErrors(state: PortsWorkbenchState): string {
  const messages = [state.scanError, state.historyError, state.servicesError, state.planError].filter(Boolean);
  if (!messages.length) return "";
  return `<div class="error-state">${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>`;
}

function renderPortRow(record: PortRecord, selectedKey: string | null): string {
  const key = portRecordKey(record);
  const selected = key === selectedKey;
  const treatability = assessPortTreatability(record);
  return `<div class="data-row ${selected ? "is-selected" : ""}">
    <span><button data-port-select="${escapeHtml(key)}" type="button" aria-pressed="${selected ? "true" : "false"}">${selected ? t("feature.ports.selectedRow") : t("feature.ports.select")}</button></span>
    <span>${escapeHtml(String(record.localPort))}</span><span>${escapeHtml(record.protocol)}</span><span>${escapeHtml(record.state)}</span>
    <span>${escapeHtml(String(record.pid))}</span><span>${escapeHtml(record.processName)}</span><span>${renderBadge(treatability.treatable ? record.riskLevel : t("feature.ports.protectedOwner"), treatability.treatable ? "warning" : "danger")}</span>
    <span>${escapeHtml(record.identity)}</span><span>${escapeHtml(String(record.confidence))}</span>
  </div>`;
}

function renderSelectedPortDetail(state: PortsWorkbenchState): string {
  const selected = selectedPortRecord(state.records, state.selectedKey);
  if (!selected) return `<h2>${t("feature.ports.selectedDetail")}</h2><div class="empty">${t("feature.ports.noSelectedDetail")}</div>`;
  const treatability = assessPortTreatability(selected);
  return `<div class="panel-head"><div><h2>${t("feature.ports.selectedDetail")}</h2><p>${escapeHtml(t(treatability.reasonKey))}</p></div>${renderBadge(treatability.treatable ? t("feature.ports.canHandle") : t("feature.ports.cannotHandle"), treatability.treatable ? "success" : "danger")}</div>
    <dl class="kv-list">
      ${detailRow(t("feature.ports.port"), `${selected.localPort} / ${selected.protocol}`)}
      ${detailRow("PID", String(selected.pid))}
      ${detailRow(t("feature.ports.process"), selected.processName)}
      ${detailRow(t("feature.ports.processPath"), selected.processPath || t("state.notAvailable"))}
      ${detailRow(t("feature.ports.ownerType"), selected.identity)}
      ${detailRow(t("feature.ports.risk"), selected.riskLevel)}
      ${detailRow(t("feature.ports.confidence"), String(selected.confidence))}
      ${detailRow(t("feature.ports.treatable"), treatability.treatable ? t("state.yes") : t("state.no"))}
      ${detailRow(t("feature.ports.recommendation"), selected.recommendation || selected.explanation || t("state.notAvailable"))}
    </dl>
    <div class="toolbar">${treatability.treatable ? renderActionButton("create-port-plan", t("feature.ports.createPlanForSelected")) : ""}</div>`;
}

function renderPortPlan(state: PortsWorkbenchState): string {
  const plan = state.plan;
  if (!plan) return `<div class="empty">${t("feature.ports.noPlan")}</div>`;
  return `<div class="port-plan">
    ${renderObjectTable(plan, ["planId", "riskLevel", "pid", "port", "processName", "processPath", "parentPid", "parentProcessName"])}
    ${plan.serviceNames.length ? renderList(t("feature.ports.services"), plan.serviceNames) : ""}
    ${plan.relatedPorts.length ? renderList(t("feature.ports.relatedPorts"), plan.relatedPorts.map(String)) : ""}
    ${plan.recommendedActions.length ? renderList(t("feature.ports.recommendedActions"), plan.recommendedActions) : ""}
    ${plan.warnings.length ? renderList(t("feature.ports.warnings"), plan.warnings) : ""}
    <p class="small-note"><strong>${t("feature.ports.ownerRecheck")}</strong> ${t("feature.ports.ownerRecheckDetail")}</p>
  </div>`;
}

function detailRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderList(title: string, items: string[]): string {
  return `<div class="small-note"><strong>${escapeHtml(title)}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}
