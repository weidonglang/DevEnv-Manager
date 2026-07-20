import type { FeatureContext } from "../../app/featureContext";
import { localize, t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { createPortResolutionPlan, enrichPortScan, executePortResolutionPlan, inspectLocalServices, portHistory, scanPorts } from "./api";
import { assessPortTreatability, portRecordKey, selectedPortRecord } from "./portSafety";
import { renderPortsTable, renderPortsWorkbench } from "./render";
import type { PortsWorkbenchState } from "./state";

export function bindPortEvents(context: FeatureContext, state: PortsWorkbenchState): void {
  bindAction(context.root, "scan-ports", () => refreshPorts(context, state, true));
  context.root.querySelector<HTMLSelectElement>("#port-scan-scope")?.addEventListener("change", (event) => {
    state.scanScope = (event.target as HTMLSelectElement).value === "full" ? "full" : "recommended";
    void refreshPorts(context, state, true);
  });
  const filter = context.root.querySelector<HTMLInputElement>("#port-filter");
  let composing = false;
  let filterTimer: number | undefined;
  filter?.addEventListener("compositionstart", () => {
    composing = true;
  });
  filter?.addEventListener("compositionend", (event) => {
    composing = false;
    state.filter = (event.target as HTMLInputElement).value;
    state.page = 1;
    updatePortsTable(context, state);
  });
  filter?.addEventListener("input", (event) => {
    state.filter = (event.target as HTMLInputElement).value;
    state.page = 1;
    if (composing) return;
    window.clearTimeout(filterTimer);
    filterTimer = window.setTimeout(() => updatePortsTable(context, state), 140);
  });
  bindPortsTableEvents(context, state);
  bindAction(context.root, "create-port-plan", async () => {
    const selected = selectedPortRecord(state.records, state.selectedKey);
    if (!selected) {
      state.planError = state.records.length ? t("feature.ports.selectPortFirst") : t("toast.portScanFirst");
      renderAndBind(context, state);
      return;
    }
    state.plan = null;
    state.executionResult = null;
    state.planError = "";
    await createPlanForPort(context, state, selected.pid, selected.localPort);
  });
  bindAction(context.root, "execute-port-plan", async () => {
    if (!state.plan) {
      state.planError = t("toast.createPortPlanFirst");
      renderAndBind(context, state);
      context.toast(t("toast.createPortPlanFirst"), true);
      return;
    }
    state.executionResult = null;
    state.planError = "";
    try {
      const result = await context.risk.run({
        command: "execute_port_resolution_plan",
        planId: state.plan.planId,
        riskLevel: "high",
        title: t("feature.ports.executeRiskTitle"),
        summary: t("feature.ports.executeRiskSummary"),
        before: [
          { label: t("feature.ports.port"), value: String(state.plan.port) },
          { label: "PID", value: String(state.plan.pid) },
          { label: t("feature.ports.process"), value: state.plan.processName },
          { label: t("feature.ports.risk"), value: state.plan.riskLevel },
        ],
        after: [
          { label: t("feature.ports.ownerRecheck"), value: t("feature.ports.ownerRecheckDetail") },
          { label: t("feature.ports.verification"), value: t("feature.ports.verificationDetail") },
        ],
        warnings: [t("feature.ports.executeRiskWarning"), ...state.plan.warnings],
        execute: (confirmationToken) => executePortResolutionPlan(state.plan!.planId, confirmationToken),
      });
      state.executionResult = result as PortsWorkbenchState["executionResult"];
      state.plan = null;
      try {
        const verification = await scanPorts(true, state.scanScope);
        applySnapshot(state, verification);
        if (state.selectedKey && !selectedPortRecord(state.records, state.selectedKey)) {
          state.selectedKey = null;
          state.selectedPort = null;
        }
        state.scanError = "";
      } catch (error) {
        state.scanError = `${localize("Port verification refresh unavailable", "端口验证刷新不可用")}：${errorMessage(error)}`;
      }
    } catch (error) {
      state.planError = errorMessage(error);
    }
    renderAndBind(context, state);
    window.requestAnimationFrame(() => {
      context.root.querySelector<HTMLElement>("[data-testid='ports-execute-result']")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  });
  bindAction(context.root, "inspect-local-services", async () => {
    state.servicesError = "";
    try {
      state.services = await inspectLocalServices();
    } catch (error) {
      state.servicesError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "copy-selected-port-diagnostics", async () => {
    const selected = selectedPortRecord(state.records, state.selectedKey);
    if (!selected) {
      state.diagnosticsResult = t("feature.ports.selectPortFirst");
      renderAndBind(context, state);
      return context.toast(t("feature.ports.selectPortFirst"), true);
    }
    const text = [
      `${t("feature.ports.port")}: ${selected.localPort}/${selected.protocol}`,
      `PID: ${selected.pid}`,
      `${t("feature.ports.process")}: ${selected.processName}`,
      `${t("feature.ports.processPath")}: ${selected.processPath || t("state.notAvailable")}`,
      `${t("feature.ports.services")}: ${selected.serviceNames.join(", ") || t("feature.ports.none")}`,
      `${t("feature.ports.identity")}: ${selected.identity}`,
      `${t("feature.ports.risk")}: ${selected.riskLevel}`,
      `${t("feature.ports.recommendation")}: ${selected.recommendation || selected.explanation}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    state.diagnosticsResult = `${t("feature.ports.diagnosticsCopied")}: ${selected.localPort}/PID ${selected.pid}`;
    renderAndBind(context, state);
    context.toast(t("feature.ports.diagnosticsCopied"));
  });
  bindAction(context.root, "retry-port-plan-after-scan", async () => {
    const retry = state.retryPlanRequest;
    if (!retry) return;
    await refreshPorts(context, state, true);
    const refreshed = state.records.find((record) => record.localPort === retry.port) ?? state.records.find((record) => record.pid === retry.pid);
    if (!refreshed) {
      state.planError = t("feature.ports.ownerChangedAfterRescan");
      renderAndBind(context, state);
      return;
    }
    state.selectedKey = portRecordKey(refreshed);
    state.selectedPort = refreshed.localPort;
    await createPlanForPort(context, state, refreshed.pid, refreshed.localPort);
  });
}

export async function refreshPorts(context: FeatureContext, state: PortsWorkbenchState, force = false): Promise<void> {
  state.snapshot = state.snapshot ? { ...state.snapshot, status: "scanning" } : null;
  state.scanError = "";
  if (context.isCurrent()) {
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
  }
  const [snapshot, history] = await Promise.allSettled([scanPorts(force, state.scanScope), portHistory()]);
  if (!context.isCurrent()) return;
  if (snapshot.status === "fulfilled") {
    applySnapshot(state, snapshot.value);
    state.page = 1;
    if (state.selectedKey && !selectedPortRecord(state.records, state.selectedKey)) {
      state.selectedKey = null;
      state.selectedPort = null;
      state.plan = null;
      state.executionResult = null;
    }
  } else {
    state.scanError = localize("Port scanning failed. The previous result remains visible; retry or export diagnostics.", "端口扫描失败，已保留上次结果；可以重试或导出诊断。");
  }
  if (history.status === "fulfilled") {
    state.history = history.value;
    state.historyError = "";
  } else {
    state.historyError = `${localize("Port history unavailable", "端口历史不可用")}：${errorMessage(history.reason)}`;
  }
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);

  if (snapshot.status === "fulfilled" && snapshot.value.scanId && !snapshot.value.complete && snapshot.value.status !== "failed") {
    try {
      const enriched = await enrichPortScan(snapshot.value.scanId);
      if (!context.isCurrent()) return;
      applySnapshot(state, enriched);
      context.root.innerHTML = renderPortsWorkbench(state);
      bindPortEvents(context, state);
    } catch {
      if (!context.isCurrent()) return;
      state.scanError ||= localize("Process details could not be enriched; the port snapshot remains available.", "进程详情补充失败，端口快照仍可使用。");
    }
  }

  try {
    state.services = await inspectLocalServices();
    state.servicesError = "";
  } catch {
    state.servicesError = localize("Local service details are temporarily unavailable.", "本地服务详情暂时不可用。");
  }
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);
}

function applySnapshot(state: PortsWorkbenchState, snapshot: PortsWorkbenchState["snapshot"]): void {
  if (!snapshot) return;
  state.snapshot = snapshot;
  state.scanScope = snapshot.scope;
  if (snapshot.records.length || snapshot.status !== "failed") state.records = snapshot.records;
  state.scanError = snapshot.status === "failed"
    ? localize("Port scanning timed out or failed. Retry or export diagnostics.", "端口扫描超时或失败，可以重试或导出诊断。")
    : snapshot.status === "stale"
      ? localize("Port scanning failed; the last successful result is retained.", "端口扫描失败，已保留上次成功结果。")
      : "";
}

function updatePortsTable(context: FeatureContext, state: PortsWorkbenchState): void {
  if (!context.isCurrent()) return;
  const panel = context.root.querySelector<HTMLElement>("#ports-table-panel");
  if (!panel) return;
  panel.innerHTML = renderPortsTable(state);
  bindPortsTableEvents(context, state);
}

function bindPortsTableEvents(context: FeatureContext, state: PortsWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.pageAction === "ports:prev") state.page = Math.max(1, state.page - 1);
      if (button.dataset.pageAction === "ports:next") state.page += 1;
      updatePortsTable(context, state);
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-port-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.portSelect || "";
      const selected = state.records.find((record) => portRecordKey(record) === key);
      if (!selected) return;
      state.selectedKey = key;
      state.selectedPort = selected.localPort;
      state.plan = null;
      state.executionResult = null;
      state.planError = "";
      renderAndBind(context, state);
    });
  });
}

async function createPlanForPort(context: FeatureContext, state: PortsWorkbenchState, pid: number, port: number): Promise<void> {
  const selected = state.records.find((record) => record.pid === pid && record.localPort === port) ?? selectedPortRecord(state.records, state.selectedKey);
  const treatability = assessPortTreatability(selected);
  if (!selected || !treatability.treatable) {
    state.plan = null;
    state.executionResult = null;
    state.planError = t(treatability.reasonKey);
    context.toast(state.planError, true);
    renderAndBind(context, state);
    return;
  }
  context.progress.start(t("feature.ports.createPlan"));
  try {
    state.plan = await createPortResolutionPlan(pid, port);
    state.executionResult = null;
    state.planError = "";
    state.retryPlanRequest = null;
    if (!context.isCurrent()) return;
    context.progress.done(t("toast.planReady"));
    renderAndBind(context, state);
    scrollToPortPlan(context);
  } catch (error) {
    const message = normalizePlanError(error);
    state.planError = message;
    state.retryPlanRequest = { pid, port };
    context.progress.fail(message);
    renderAndBind(context, state);
  }
}

function renderAndBind(context: FeatureContext, state: PortsWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);
}

function scrollToPortPlan(context: FeatureContext): void {
  window.requestAnimationFrame(() => {
    context.root.querySelector<HTMLElement>("#ports-plan-panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function normalizePlanError(error: unknown): string {
  const message = errorMessage(error);
  if (message.toLowerCase().includes("owner changed")) return t("feature.ports.ownerChanged");
  if (message.toLowerCase().includes("pid 4") || message.toLowerCase().includes("protected")) return t("feature.ports.protectedOwnerReason");
  if (message.toLowerCase().includes("service_owned_port") || message.toLowerCase().includes("windows service owns")) return t("feature.ports.serviceOwnedReason");
  return message;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}
