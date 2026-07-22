import type { PortRecord } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import { assessPortTreatability, portRecordKey, selectedPortRecord } from "./portSafety";
import type { PortsWorkbenchState } from "./state";

export function renderPortsWorkbench(state: PortsWorkbenchState): string {
  return `
    <div class="feature-layout">
      ${renderPortsShell(state)}
      <section class="panel" id="ports-table-panel" data-testid="ports-table-section">
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
  return `<div class="execution-result ${result.success ? "ok" : "warn"}" data-testid="ports-execute-result">
    <h3>${t("feature.ports.executionResult")}</h3>
    <div class="metrics">
      ${renderMetric(t("feature.ports.resultStatus"), result.success ? t("feature.ports.resultCompleted") : t("feature.ports.resultNotCompleted"))}
      ${renderMetric(t("feature.ports.port"), result.targetPort)}
      ${renderMetric("PID", result.targetPid)}
      ${renderMetric(t("feature.ports.process"), result.processName || t("state.notAvailable"))}
      ${renderMetric(t("feature.ports.serviceOwned"), result.serviceOwned ? t("state.yes") : t("state.no"))}
      ${renderMetric(t("feature.ports.requiresAdmin"), result.requiresAdmin ? t("state.yes") : t("state.no"))}
    </div>
    ${renderObjectTable(result, ["message", "pidExited", "portReleased", "relatedPortsReleased", "remainingRelatedPorts", "releaseCheckedAt"])}
    ${result.failureReason ? `<div class="small-note"><strong>${t("feature.ports.failureReason")}</strong><p>${escapeHtml(result.failureReason)}</p></div>` : ""}
    ${result.nextSteps.length ? renderList(t("feature.ports.nextSteps"), result.nextSteps) : ""}
    ${renderRemainingOwners(result.remainingOwners)}
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
    ${renderScanStatus(state)}
    ${renderPortErrors(state)}
    <input id="port-filter" value="${escapeHtml(state.filter)}" placeholder="${t("feature.ports.filter")}" autocomplete="off" />
    <div class="toolbar">
      ${renderActionButton("scan-ports", t("dashboard.scanPorts"), "primary")}
      <label class="inline-field">${localize("Scan scope", "扫描范围")}<select id="port-scan-scope" data-testid="ports-scan-scope"><option value="recommended" ${state.scanScope === "recommended" ? "selected" : ""}>${localize("Recommended", "推荐")}</option><option value="full" ${state.scanScope === "full" ? "selected" : ""}>${localize("All connections", "全部连接")}</option></select></label>
      ${renderActionButton("create-port-plan", t("feature.ports.createPlanForSelected"))}
      ${renderActionButton("execute-port-plan", t("feature.ports.executePlan"), "danger")}
      ${renderActionButton("inspect-local-services", t("feature.ports.inspectServices"))}
      ${state.retryPlanRequest ? renderActionButton("retry-port-plan-after-scan", t("feature.ports.rescanAndRetry")) : ""}
    </div>
  </section>`;
}

function renderScanStatus(state: PortsWorkbenchState): string {
  const snapshot = state.snapshot;
  if (!snapshot) return `<div class="small-note" data-testid="ports-scan-status">${localize("No port snapshot yet.", "尚无端口快照。")} </div>`;
  const status = snapshot.status === "scanning"
    ? localize("Scanning", "正在扫描")
    : snapshot.status === "stale"
      ? localize("Last successful result retained", "已保留上次成功结果")
      : snapshot.status === "failed"
        ? localize("Scan failed", "扫描失败")
        : snapshot.complete
          ? localize("Snapshot and process details complete", "快照和进程详情已完成")
          : localize("Snapshot ready; enriching process details", "快照已就绪，正在补充进程详情");
  const scannedAt = snapshot.scannedAt ? new Date(snapshot.scannedAt * 1000).toLocaleString() : localize("Not completed", "尚未完成");
  return `<div class="scan-status-strip" data-testid="ports-scan-status">
    <strong>${escapeHtml(status)}</strong>
    <span>${localize("Source", "来源")}: ${escapeHtml(snapshot.source || "-")}</span>
    <span>${localize("Last scan", "最近扫描")}: ${escapeHtml(scannedAt)}</span>
    <span>${localize("Raw / kept", "原始 / 保留")}: ${snapshot.rawCount} / ${snapshot.filteredCount}${snapshot.truncated ? ` (${localize("truncated", "已截断")})` : ""}</span>
    <span>${snapshot.elapsedMs} ms</span>
  </div>`;
}

export function renderPortsTable(state: PortsWorkbenchState): string {
  const rows = state.records.filter((record) =>
    `${valueOf(record, "localPort")} ${valueOf(record, "processName")} ${valueOf(record, "friendlyNameEn")} ${valueOf(record, "friendlyNameZh")} ${valueOf(record, "identity")} ${record.serviceNames.join(" ")}`.toLowerCase().includes(state.filter.toLowerCase()),
  );
  const page = pageItems(rows, state.page, 10);
  return `
        <h2>${t("feature.ports.table")}</h2>
        <div class="data-table port-table">
          <div class="data-row head"><span>${t("feature.ports.select")}</span><span>${t("feature.ports.port")}</span><span>${t("feature.ports.protocol")}</span><span>${t("feature.ports.state")}</span><span>PID</span><span>${localize("Friendly name", "友好程序名")}</span><span>${localize("Process", "真实进程")}</span><span>${localize("Bindings / connections", "绑定/连接")}</span><span>${t("feature.ports.services")}</span><span>${localize("Operation risk", "操作风险")}</span><span>${t("feature.ports.confidence")}</span><span>${t("feature.ports.recommendation")}</span></div>
          ${page.items.map((record) => renderPortRow(record, state.selectedKey)).join("") || `<div class="empty">${t("feature.ports.noRecords")}</div>`}
        </div>
        ${renderPagination("ports", page.page, page.totalPages, page.total)}
  `;
}

function renderPortErrors(state: PortsWorkbenchState): string {
  const messages = [state.scanError, state.historyError, state.servicesError, state.planError].filter(Boolean);
  if (!messages.length) return "";
  return `<div class="error-state" data-testid="ports-operation-error">${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>`;
}

function renderPortRow(record: PortRecord, selectedKey: string | null): string {
  const key = portRecordKey(record);
  const selected = key === selectedKey;
  const treatability = assessPortTreatability(record);
  const friendlyName = localize(record.friendlyNameEn, record.friendlyNameZh);
  return `<div class="data-row ${selected ? "is-selected" : ""}" data-testid="ports-row" data-port-group-id="${escapeHtml(record.groupId)}" data-port-visual-key="${escapeHtml(`${record.protocol}:${record.localPort}:${record.pid}:${record.state}`)}">
    <span><button data-port-select="${escapeHtml(key)}" type="button" aria-pressed="${selected ? "true" : "false"}">${selected ? t("feature.ports.selectedRow") : t("feature.ports.select")}</button></span>
    <span>${escapeHtml(String(record.localPort))}</span><span>${escapeHtml(record.protocol)}</span><span>${escapeHtml(record.state)}</span>
    <span>${escapeHtml(String(record.pid))}</span><span>${escapeHtml(friendlyName)}</span><span>${escapeHtml(record.processName || t("state.notAvailable"))}</span>
    <span data-testid="ports-row-binding-summary">${escapeHtml(bindingSummary(record))}</span><span>${escapeHtml(record.serviceDisplayNames.join(", ") || record.serviceNames.join(", ") || t("feature.ports.none"))}</span>
    <span>${renderBadge(operationRiskLabel(record.riskLevel), treatability.treatable ? "warning" : "danger")}</span><span>${escapeHtml(confidenceLabel(record))}</span><span data-testid="ports-row-closeability-reason">${escapeHtml(t(treatability.reasonKey))}</span>
  </div>`;
}

function renderSelectedPortDetail(state: PortsWorkbenchState): string {
  const selected = selectedPortRecord(state.records, state.selectedKey);
  if (!selected) return `<h2>${t("feature.ports.selectedDetail")}</h2><div class="empty" data-testid="ports-inline-guidance">${t("feature.ports.noSelectedDetail")}</div>${state.diagnosticsResult ? `<div class="small-note" data-testid="ports-diagnostics-result">${escapeHtml(state.diagnosticsResult)}</div>` : ""}`;
  const treatability = assessPortTreatability(selected);
  return `<div class="panel-head"><div><h2>${t("feature.ports.selectedDetail")}</h2><p>${escapeHtml(t(treatability.reasonKey))}</p></div>${renderBadge(treatability.treatable ? t("feature.ports.canHandle") : t("feature.ports.cannotHandle"), treatability.treatable ? "success" : "danger")}</div>
    <dl class="kv-list">
      ${detailRow(t("feature.ports.port"), `${selected.localPort} / ${selected.protocol}`)}
      ${detailRow("PID", String(selected.pid))}
      ${detailRow(localize("Friendly name", "友好程序名"), localize(selected.friendlyNameEn, selected.friendlyNameZh))}
      ${detailRow(t("feature.ports.process"), selected.processName)}
      ${detailRow(localize("Process started", "进程启动时间"), selected.processStartTime ? new Date(selected.processStartTime * 1000).toLocaleString() : t("state.notAvailable"))}
      ${detailRow(t("feature.ports.processPath"), selected.processPath || t("state.notAvailable"))}
      ${detailRow("ProductName", selected.productName || t("state.notAvailable"))}
      ${detailRow("FileDescription", selected.fileDescription || t("state.notAvailable"))}
      ${detailRow("CompanyName", selected.companyName || t("state.notAvailable"))}
      ${detailRow(localize("Publisher", "文件发布者"), selected.publisher || t("state.notAvailable"))}
      ${detailRow(localize("Parent process", "父进程"), selected.parentProcessName ? `${selected.parentProcessName} / PID ${selected.parentPid}` : t("state.notAvailable"))}
      ${detailRow(t("feature.ports.services"), selected.serviceNames.join(", ") || t("feature.ports.none"))}
      ${detailRow(localize("Service display names", "服务显示名"), selected.serviceDisplayNames.join(", ") || t("feature.ports.none"))}
      ${detailRow(localize("Service state / start mode", "服务状态/启动类型"), [selected.serviceStates.join(", "), selected.serviceStartModes.join(", ")].filter(Boolean).join(" / ") || t("feature.ports.none"))}
      ${detailRow(t("feature.ports.ownerType"), selected.identityCategory)}
      ${detailRow(t("feature.ports.ownerRisk"), selected.riskLevel)}
      ${detailRow(t("feature.ports.operationRisk"), treatability.treatable ? t("feature.ports.operationRiskHigh") : t("feature.ports.notExecutable"))}
      ${detailRow(t("feature.ports.confidence"), confidenceLabel(selected))}
      ${detailRow(localize("Identity catalog", "识别目录"), selected.identityCatalogVersion)}
      ${detailRow(t("feature.ports.treatable"), treatability.treatable ? t("state.yes") : t("state.no"))}
      ${detailRow(t("feature.ports.recommendation"), localize(selected.recommendationEn, selected.recommendationZh) || selected.explanation || t("state.notAvailable"))}
    </dl>
    ${renderServiceDetails(selected)}
    ${renderBindings(selected)}
    <div data-testid="ports-source-evidence">
      ${renderList(localize("Scan sources", "扫描来源"), selected.scanSources.map((source) => `${source.source} / ${new Date(source.scannedAt * 1000).toLocaleString()} / ${source.recordCount}${source.fallback ? ` / ${localize("fallback", "回退来源")}` : ""}`))}
      ${selected.scanSources.some((source) => source.conflicts.length) ? renderList(localize("Source conflicts", "来源冲突"), selected.scanSources.flatMap((source) => source.conflicts.map((conflict) => `${source.source}: ${conflict}`))) : ""}
    </div>
    ${selected.evidence.length ? renderList(localize("Recognition evidence", "识别证据"), selected.evidence) : ""}
    ${selected.conflictEvidence.length ? renderList(localize("Recognition conflicts", "冲突证据"), selected.conflictEvidence) : ""}
    <div class="toolbar">
      ${treatability.treatable ? renderActionButton("create-port-plan", t("feature.ports.createPlanForSelected")) : ""}
      ${renderActionButton("copy-selected-port-diagnostics", t("feature.ports.copyDiagnostics"))}
      ${renderActionButton("scan-ports", t("dashboard.scanPorts"))}
      ${selected.serviceNames.length ? renderActionButton("inspect-local-services", t("feature.ports.inspectServices")) : ""}
    </div>
    ${state.diagnosticsResult ? `<div class="small-note" data-testid="ports-diagnostics-result">${escapeHtml(state.diagnosticsResult)}</div>` : ""}`;
}

function renderPortPlan(state: PortsWorkbenchState): string {
  const plan = state.plan;
  if (!plan) return `<div class="empty">${t("feature.ports.noPlan")}</div>`;
  return `<div class="port-plan" data-testid="ports-plan-preview">
    ${renderObjectTable(plan, ["planId", "groupId", "groupFingerprint", "scanId", "riskLevel", "pid", "port", "protocol", "processStartTime", "processName", "processPath", "commandLineFingerprint", "expectedOwnerIdentity", "createdAt", "expiresAt", "parentPid", "parentProcessName"])}
    ${plan.bindings.length ? renderList(localize("Planned bindings", "计划绑定"), plan.bindings.map((binding) => `${binding.localEndpoint} / ${binding.state}`)) : ""}
    ${plan.serviceNames.length ? renderList(t("feature.ports.services"), plan.serviceNames) : ""}
    ${plan.relatedPorts.length ? renderList(t("feature.ports.relatedPorts"), plan.relatedPorts.map(String)) : ""}
    ${plan.recommendedActions.length ? renderList(t("feature.ports.recommendedActions"), plan.recommendedActions) : ""}
    ${plan.warnings.length ? renderList(t("feature.ports.warnings"), plan.warnings) : ""}
    <p class="small-note"><strong>${t("feature.ports.ownerRecheck")}</strong> ${t("feature.ports.ownerRecheckDetail")}</p>
  </div>`;
}

function renderRemainingOwners(owners: PortRecord[]): string {
  if (!owners.length) return "";
  return `<div class="small-note"><strong>${t("feature.ports.remainingOwners")}</strong>
    <div class="table-wrap"><table><thead><tr><th>${t("feature.ports.protocol")}</th><th>${t("feature.ports.localAddress")}</th><th>${t("feature.ports.port")}</th><th>PID</th><th>${t("feature.ports.process")}</th><th>${t("feature.ports.state")}</th></tr></thead><tbody>${owners
      .map((owner) => `<tr><td>${escapeHtml(owner.protocol)}</td><td>${escapeHtml(owner.localAddress)}</td><td>${escapeHtml(String(owner.localPort))}</td><td>${escapeHtml(String(owner.pid))}</td><td>${escapeHtml(owner.processName)}</td><td>${escapeHtml(owner.state)}</td></tr>`)
      .join("")}</tbody></table></div>
  </div>`;
}

function detailRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderList(title: string, items: string[]): string {
  return `<div class="small-note"><strong>${escapeHtml(title)}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function renderServiceDetails(record: PortRecord): string {
  if (!record.serviceDetails.length) {
    if (!record.processName.toLowerCase().includes("svchost")) return "";
    return `<div class="small-note" data-testid="ports-service-host-unresolved"><strong>${localize("Windows Service Host", "Windows 服务宿主")}</strong><p>${localize("The specific hosted service could not be resolved. This owner remains protected and cannot use ordinary process termination.", "具体宿主服务未解析；该占用方仍受保护，不能使用普通进程结束操作。")}</p></div>`;
  }
  return `<div class="table-wrap" data-testid="ports-service-details"><table><thead><tr><th>${localize("Service", "服务")}</th><th>${localize("State / start", "状态/启动")}</th><th>${localize("Type / host group", "类型/宿主组")}</th><th>${localize("Description", "说明")}</th><th>${localize("Service DLL", "服务 DLL")}</th></tr></thead><tbody>${record.serviceDetails.map((service) => `<tr>
    <td><strong>${escapeHtml(service.displayName || service.name)}</strong><small>${escapeHtml(service.name)} / PID ${service.processId}${service.coreWindowsService ? ` / ${localize("Windows system path", "Windows 系统路径")}` : ""}</small></td>
    <td>${escapeHtml([service.state, service.startMode].filter(Boolean).join(" / ") || t("state.notAvailable"))}</td>
    <td>${escapeHtml([service.serviceType, service.serviceHostGroup ? `-k ${service.serviceHostGroup}` : ""].filter(Boolean).join(" / ") || t("state.notAvailable"))}</td>
    <td>${escapeHtml(service.description || t("state.notAvailable"))}</td>
    <td title="${escapeHtml(service.pathName)}">${escapeHtml(service.serviceDll || service.pathName || t("state.notAvailable"))}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function bindingSummary(record: PortRecord): string {
  if (record.state === "ESTABLISHED") {
    return localize(`${record.remoteConnectionCount} active connections`, `${record.remoteConnectionCount} 个活动连接`);
  }
  if (record.hasIpv4 && record.hasIpv6) {
    return localize(`IPv4 + IPv6, ${record.bindingCount} bindings`, `IPv4 + IPv6，${record.bindingCount} 个绑定`);
  }
  return localize(`${record.bindingCount} bindings`, `${record.bindingCount} 个绑定`);
}

function renderBindings(record: PortRecord): string {
  if (!record.bindings.length) return "";
  return `<div class="small-note" data-testid="ports-binding-details"><strong>${localize("Local bindings and redacted remote summary", "本地绑定和脱敏远端摘要")}</strong><ul>${record.bindings.map((binding) => `<li><code>${escapeHtml(binding.localEndpoint)}</code> · ${escapeHtml(binding.state)}${binding.remoteEndpoint && binding.remoteEndpoint !== "*" ? ` → <code>${escapeHtml(binding.remoteEndpoint)}</code>` : ""}</li>`).join("")}</ul></div>`;
}

function confidenceLabel(record: PortRecord): string {
  const labels: Record<PortRecord["confidenceLevel"], string> = {
    verified: localize("Verified", "已验证"),
    high: localize("High confidence", "高置信度"),
    medium: localize("Possible", "可能是"),
    low: localize("Weak match", "弱识别"),
    unknown: localize("Unknown", "未知"),
    conflict: localize("Identity conflict", "身份冲突"),
  };
  return `${labels[record.confidenceLevel]} · ${record.confidence}%`;
}

function operationRiskLabel(level: string): string {
  if (level === "critical") return localize("Protected", "受保护");
  if (level === "high") return localize("High", "高风险");
  if (level === "medium") return localize("Medium", "中风险");
  return localize("Low", "低风险");
}
