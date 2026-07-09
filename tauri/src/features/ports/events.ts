import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction, valueOf } from "../sharedView";
import { createPortResolutionPlan, executePortResolutionPlan, inspectLocalServices, portHistory, scanPorts, stopLocalService } from "./api";
import { assessPortTreatability, portRecordKey, selectedPortRecord } from "./portSafety";
import { renderPortsTable, renderPortsWorkbench } from "./render";
import type { PortsWorkbenchState } from "./state";

export function bindPortEvents(context: FeatureContext, state: PortsWorkbenchState): void {
  bindAction(context.root, "scan-ports", () => refreshPorts(context, state));
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
    if (!selected) return context.toast(state.records.length ? t("feature.ports.selectPortFirst") : t("toast.portScanFirst"), true);
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
    } catch (error) {
      state.planError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "inspect-local-services", async () => {
    state.services = await inspectLocalServices();
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
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
  bindAction(context.root, "stop-local-service", () =>
    {
      const serviceName = valueOf(state.services[0], "serviceName", "");
      const selected = selectedPortRecord(state.records, state.selectedKey);
      const port = selected?.localPort ?? state.selectedPort ?? 0;
      return context.risk.run({
      command: "stop_local_service",
      planId: `${port}:${serviceName}`,
      riskLevel: "high",
      title: "Stop local service",
      summary: "Stops a selected local development service through a backend token gate.",
      warnings: ["Confirm the service name and owning process before stopping it."],
      execute: (confirmationToken) => stopLocalService(port, serviceName, confirmationToken),
      });
    },
  );
  bindAction(context.root, "retry-port-plan-after-scan", async () => {
    const retry = state.retryPlanRequest;
    if (!retry) return;
    await refreshPorts(context, state);
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

export async function refreshPorts(context: FeatureContext, state: PortsWorkbenchState): Promise<void> {
  const [records, history, services] = await Promise.allSettled([scanPorts(), portHistory(), inspectLocalServices()]);
  if (!context.isCurrent()) return;
  if (records.status === "fulfilled") {
    state.records = records.value;
    state.page = 1;
    state.scanError = "";
    if (state.selectedKey && !selectedPortRecord(state.records, state.selectedKey)) {
      state.selectedKey = null;
      state.selectedPort = null;
      state.plan = null;
      state.executionResult = null;
    }
  } else {
    state.records = [];
    state.scanError = `Port scan unavailable: ${errorMessage(records.reason)}`;
  }
  if (history.status === "fulfilled") {
    state.history = history.value;
    state.historyError = "";
  } else {
    state.historyError = `Port history unavailable: ${errorMessage(history.reason)}`;
  }
  if (services.status === "fulfilled") {
    state.services = services.value;
    state.servicesError = "";
  } else {
    state.servicesError = `Local services unavailable: ${errorMessage(services.reason)}`;
  }
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);
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
