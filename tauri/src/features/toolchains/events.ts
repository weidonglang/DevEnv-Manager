import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { createMySqlRepairPlan, executeMySqlRepairPlan, inspectLocalServices, inspectMySqlRepair, inspectPlatformToolchains, inspectSystemPlatforms, inspectToolchains, manageLocalService, manageSystemPlatform } from "./api";
import { renderToolchainWorkbench } from "./render";
import type { ToolchainWorkbenchState } from "./state";

export function bindToolchainEvents(context: FeatureContext, state: ToolchainWorkbenchState): void {
  bindAction(context.root, "inspect-toolchains", () => refreshToolchains(context, state));
  bindAction(context.root, "inspect-platforms", async () => {
    state.platform = await inspectPlatformToolchains();
    state.system = await inspectSystemPlatforms();
    context.root.innerHTML = renderToolchainWorkbench(state);
    bindToolchainEvents(context, state);
  });
  bindAction(context.root, "inspect-services", async () => {
    state.services = await inspectLocalServices();
    context.root.innerHTML = renderToolchainWorkbench(state);
    bindToolchainEvents(context, state);
  });
  bindAction(context.root, "manage-local-service", () =>
    context.risk.run({
      command: "manage_local_service",
      planId: "manage_local_service:selected",
      riskLevel: "high",
      title: "Manage local service",
      summary: "Starts or stops a selected local service through a backend token gate.",
      warnings: ["Confirm service name and action before execution."],
      execute: (confirmationToken) => manageLocalService(valueOf(state.services[0], "serviceName", ""), "stop", confirmationToken),
    }),
  );
  bindAction(context.root, "manage-system-platform", () =>
    context.risk.run({
      command: "manage_system_platform",
      planId: "manage_system_platform:selected",
      riskLevel: "high",
      title: "Manage system platform",
      summary: "Runs a platform management action through a backend token gate.",
      warnings: ["Review target platform and action before execution."],
      execute: (confirmationToken) => manageSystemPlatform("open", null, confirmationToken),
    }),
  );
  bindAction(context.root, "inspect-mysql", async () => {
    state.mysql = await inspectMySqlRepair();
    context.root.innerHTML = renderToolchainWorkbench(state);
    bindToolchainEvents(context, state);
  });
  bindAction(context.root, "create-mysql-plan", async () => {
    state.mysqlPlan = await createMySqlRepairPlan(valueOf(state.mysql, "candidates.0.id", ""), "repair");
    context.root.innerHTML = renderToolchainWorkbench(state);
    bindToolchainEvents(context, state);
  });
  bindAction(context.root, "execute-mysql-plan", () => {
    if (!state.mysqlPlan) return context.toast("Create a MySQL repair plan first.", true);
    return context.risk.run({
      command: "execute_mysql_repair_plan",
      planId: state.mysqlPlan.planId,
      riskLevel: "critical",
      title: "Execute MySQL repair plan",
      summary: "Runs the guarded MySQL repair plan. Critical flow keeps explicit confirmation.",
      warnings: ["Complete a full Data backup before execution.", "This may affect database service startup."],
      execute: (confirmationToken) => executeMySqlRepairPlan(state.mysqlPlan!.planId, "", confirmationToken),
    });
  });
}

export async function refreshToolchains(context: FeatureContext, state: ToolchainWorkbenchState): Promise<void> {
  const [report, platform, system, services, mysql] = await Promise.all([
    inspectToolchains(),
    inspectPlatformToolchains(),
    inspectSystemPlatforms(),
    inspectLocalServices(),
    inspectMySqlRepair(),
  ]);
  state.report = report;
  state.platform = platform;
  state.system = system;
  state.services = services;
  state.mysql = mysql;
  context.root.innerHTML = renderToolchainWorkbench(state);
  bindToolchainEvents(context, state);
}
