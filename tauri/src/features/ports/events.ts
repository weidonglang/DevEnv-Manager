import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction, valueOf } from "../sharedView";
import { createPortResolutionPlan, executePortResolutionPlan, inspectLocalServices, portHistory, scanPorts, stopLocalService } from "./api";
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
    const first = state.records[0];
    if (!first) return context.toast(t("toast.portScanFirst"), true);
    await createPlanForPort(context, state, Number(valueOf(first, "pid", "0")), Number(valueOf(first, "localPort", "0")));
  });
  bindAction(context.root, "execute-port-plan", async () => {
    if (!state.plan) {
      context.toast(t("toast.createPortPlanFirst"), true);
      return;
    }
    const result = await context.risk.run({
      command: "execute_port_resolution_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      title: "Execute port resolution plan",
      summary: "Executes a backend-generated plan and verifies whether the port was released.",
      warnings: ["Review owner, identity, risk level, and confidence before executing."],
      execute: (confirmationToken) => executePortResolutionPlan(state.plan!.planId, confirmationToken),
    });
    state.executionResult = result as PortsWorkbenchState["executionResult"];
    renderAndBind(context, state);
  });
  bindAction(context.root, "inspect-local-services", async () => {
    state.services = await inspectLocalServices();
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
  });
  bindAction(context.root, "stop-local-service", () =>
    {
      const serviceName = valueOf(state.services[0], "serviceName", "");
      const port = state.selectedPort ?? 0;
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
  context.root.querySelectorAll<HTMLButtonElement>("[data-port-pid]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedPort = Number(button.dataset.port || "0");
      await createPlanForPort(context, state, Number(button.dataset.portPid || "0"), state.selectedPort);
    });
  });
}

async function createPlanForPort(context: FeatureContext, state: PortsWorkbenchState, pid: number, port: number): Promise<void> {
  context.progress.start(t("feature.ports.createPlan"));
  try {
    state.plan = await createPortResolutionPlan(pid, port);
    state.executionResult = null;
    state.planError = "";
    state.retryPlanRequest = null;
    if (!context.isCurrent()) return;
    context.progress.done(t("toast.planReady"));
    renderAndBind(context, state);
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

function normalizePlanError(error: unknown): string {
  const message = errorMessage(error);
  if (message.toLowerCase().includes("owner changed")) return t("feature.ports.ownerChanged");
  return message;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}
