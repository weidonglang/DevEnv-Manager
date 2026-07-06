import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { createPortResolutionPlan, executePortResolutionPlan, inspectLocalServices, portHistory, scanPorts, stopLocalService } from "./api";
import { renderPortsWorkbench } from "./render";
import type { PortsWorkbenchState } from "./state";

export function bindPortEvents(context: FeatureContext, state: PortsWorkbenchState): void {
  bindAction(context.root, "scan-ports", () => refreshPorts(context, state));
  context.root.querySelector<HTMLInputElement>("#port-filter")?.addEventListener("input", (event) => {
    state.filter = (event.target as HTMLInputElement).value;
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-port-pid]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedPort = Number(button.dataset.port || "0");
      state.plan = await createPortResolutionPlan(Number(button.dataset.portPid || "0"), state.selectedPort);
      context.root.innerHTML = renderPortsWorkbench(state);
      bindPortEvents(context, state);
    });
  });
  bindAction(context.root, "create-port-plan", async () => {
    const first = state.records[0];
    if (!first) return;
    state.plan = await createPortResolutionPlan(Number(valueOf(first, "pid", "0")), Number(valueOf(first, "localPort", "0")));
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
  });
  bindAction(context.root, "execute-port-plan", async () => {
    if (!state.plan) {
      context.toast("Create a port resolution plan first.", true);
      return;
    }
    await context.risk.run({
      command: "execute_port_resolution_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      title: "Execute port resolution plan",
      summary: "Executes a backend-generated plan and verifies whether the port was released.",
      warnings: ["Review owner, identity, risk level, and confidence before executing."],
      execute: (confirmationToken) => executePortResolutionPlan(state.plan!.planId, confirmationToken),
    });
  });
  bindAction(context.root, "inspect-local-services", async () => {
    state.services = await inspectLocalServices();
    context.root.innerHTML = renderPortsWorkbench(state);
    bindPortEvents(context, state);
  });
  bindAction(context.root, "stop-local-service", () =>
    context.risk.run({
      command: "stop_local_service",
      planId: "stop_local_service:selected",
      riskLevel: "high",
      title: "Stop local service",
      summary: "Stops a selected local development service through a backend token gate.",
      warnings: ["Confirm the service name and owning process before stopping it."],
      execute: (confirmationToken) => stopLocalService(state.selectedPort ?? 0, valueOf(state.services[0], "serviceName", ""), confirmationToken),
    }),
  );
}

export async function refreshPorts(context: FeatureContext, state: PortsWorkbenchState): Promise<void> {
  const [records, history, services] = await Promise.all([scanPorts(), portHistory(), inspectLocalServices()]);
  state.records = records;
  state.history = history;
  state.services = services;
  context.root.innerHTML = renderPortsWorkbench(state);
  bindPortEvents(context, state);
}
