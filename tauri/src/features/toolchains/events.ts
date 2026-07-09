import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { createMySqlRepairPlan, executeMySqlRepairPlan, inspectCommandSafety, inspectLocalServices, inspectMySqlRepair, inspectPlatformToolchains, inspectSystemPlatforms, inspectToolchains, manageLocalService, manageSystemPlatform, runLearningCheck } from "./api";
import { renderToolchainWorkbench } from "./render";
import type { ToolchainWorkbenchState } from "./state";

export function bindToolchainEvents(context: FeatureContext, state: ToolchainWorkbenchState): void {
  bindAction(context.root, "inspect-toolchains", () => refreshToolchains(context, state));
  bindAction(context.root, "inspect-platforms", async () => {
    context.progress.start(t("feature.toolchains.checkingPlatforms"));
    const [platform, system] = await Promise.allSettled([inspectPlatformToolchains(), inspectSystemPlatforms()]);
    if (!context.isCurrent()) return;
    if (platform.status === "fulfilled") {
      state.platform = platform.value;
      delete state.errors.platform;
    } else {
      state.errors.platform = errorMessage(platform.reason);
    }
    if (system.status === "fulfilled") {
      state.system = system.value;
      delete state.errors.system;
    } else {
      state.errors.system = errorMessage(system.reason);
    }
    if (state.errors.platform || state.errors.system) context.progress.fail(state.errors.platform || state.errors.system || "");
    else context.progress.done(t("feature.toolchains.checkDone"));
    renderAndBind(context, state);
  });
  bindAction(context.root, "inspect-services", async () => {
    context.progress.start(t("feature.toolchains.checkingServices"));
    try {
      state.services = await inspectLocalServices();
      if (!context.isCurrent()) return;
      delete state.errors.services;
      context.progress.done(t("feature.toolchains.checkDone"));
    } catch (error) {
      state.errors.services = errorMessage(error);
      context.progress.fail(state.errors.services);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "manage-local-service", () =>
    {
      const service = state.services[0];
      if (!service) {
        context.toast(t("toast.inspectServicesFirst"), true);
        return;
      }
      return context.risk.run({
      command: "manage_local_service",
      planId: `${service.serviceName}:stop`,
      riskLevel: "high",
      title: "Manage local service",
      summary: "Starts or stops a selected local service through a backend token gate.",
      warnings: ["Confirm service name and action before execution."],
      execute: (confirmationToken) => manageLocalService(service.serviceName, "stop", confirmationToken),
      });
    },
  );
  bindAction(context.root, "manage-system-platform", () =>
    context.risk.run({
      command: "manage_system_platform",
      planId: "open:",
      riskLevel: "high",
      title: "Manage system platform",
      summary: "Runs a platform management action through a backend token gate.",
      warnings: ["Review target platform and action before execution."],
      execute: (confirmationToken) => manageSystemPlatform("open", null, confirmationToken),
    }),
  );
  bindAction(context.root, "inspect-mysql", async () => {
    context.progress.start(t("feature.toolchains.checkingMysql"));
    try {
      state.mysql = await inspectMySqlRepair();
      if (!context.isCurrent()) return;
      delete state.errors.mysql;
      context.progress.done(t("feature.toolchains.checkDone"));
    } catch (error) {
      state.errors.mysql = errorMessage(error);
      context.progress.fail(state.errors.mysql);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "create-mysql-plan", async () => {
    const candidate = state.mysql?.candidates[0];
    if (!candidate) {
      context.toast(t("toast.runMysqlDiagnosisFirst"), true);
      return;
    }
    context.progress.start(t("feature.toolchains.creatingMysqlPlan"));
    try {
      state.mysqlPlan = await createMySqlRepairPlan(candidate.id, "repair");
      state.mysqlResult = null;
      context.progress.done(t("toast.planReady"));
      renderAndBind(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-mysql-plan", async () => {
    if (!state.mysqlPlan) return context.toast(t("toast.createMysqlPlanFirst"), true);
    state.mysqlResult = null;
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "execute_mysql_repair_plan",
        planId: state.mysqlPlan.planId,
        actionId: `mysql_${state.mysqlPlan.action}`,
        riskLevel: state.mysqlPlan.riskLevel,
        planFingerprint: state.mysqlPlan.planFingerprint,
        title: "Execute MySQL repair plan",
        summary: "Runs the guarded MySQL repair plan. Critical flow keeps explicit confirmation.",
        warnings: ["Complete a full Data backup before execution.", "This may affect database service startup."],
        execute: (confirmationToken) => executeMySqlRepairPlan(state.mysqlPlan!.planId, "", confirmationToken),
      });
      state.mysqlResult = result as ToolchainWorkbenchState["mysqlResult"];
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "inspect-learning-command", async () => {
    state.learningCommand = learningCommandInput(context, state);
    context.progress.start(t("feature.toolchains.learningInspecting"));
    try {
      state.learningSafety = await inspectCommandSafety(state.learningCommand);
      state.learningResult = null;
      state.learningError = "";
      context.progress.done(t("feature.toolchains.learningChecked"));
    } catch (error) {
      state.learningError = errorMessage(error);
      context.progress.fail(state.learningError);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "run-learning-command", async () => {
    state.learningCommand = learningCommandInput(context, state);
    context.progress.start(t("feature.toolchains.learningRunning"));
    try {
      state.learningSafety = await inspectCommandSafety(state.learningCommand);
      state.learningResult = await runLearningCheck(state.learningCommand);
      state.learningError = "";
      context.progress.done(t("feature.toolchains.learningDone"));
    } catch (error) {
      state.learningResult = null;
      state.learningError = errorMessage(error);
      context.progress.fail(state.learningError);
    }
    renderAndBind(context, state);
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-learning-command]").forEach((button) => {
    button.addEventListener("click", () => {
      state.learningCommand = button.dataset.learningCommand || state.learningCommand;
      state.learningSafety = null;
      state.learningResult = null;
      state.learningError = "";
      renderAndBind(context, state);
    });
  });
}

export async function refreshToolchains(context: FeatureContext, state: ToolchainWorkbenchState): Promise<void> {
  context.progress.start(t("feature.toolchains.checkingAll"));
  const [report, platform, system, services, mysql] = await Promise.allSettled([
    inspectToolchains(),
    inspectPlatformToolchains(),
    inspectSystemPlatforms(),
    inspectLocalServices(),
    inspectMySqlRepair(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  if (report.status === "fulfilled") state.report = report.value;
  else state.errors.report = errorMessage(report.reason);
  if (platform.status === "fulfilled") state.platform = platform.value;
  else state.errors.platform = errorMessage(platform.reason);
  if (system.status === "fulfilled") state.system = system.value;
  else state.errors.system = errorMessage(system.reason);
  if (services.status === "fulfilled") state.services = services.value;
  else state.errors.services = errorMessage(services.reason);
  if (mysql.status === "fulfilled") state.mysql = mysql.value;
  else state.errors.mysql = errorMessage(mysql.reason);
  if (Object.keys(state.errors).length) context.progress.fail(t("feature.toolchains.checkPartialFailed"));
  else context.progress.done(t("feature.toolchains.checkDone"));
  renderAndBind(context, state);
}

function renderAndBind(context: FeatureContext, state: ToolchainWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderToolchainWorkbench(state);
  bindToolchainEvents(context, state);
}

function learningCommandInput(context: FeatureContext, state: ToolchainWorkbenchState): string {
  return context.root.querySelector<HTMLInputElement>("#learning-command")?.value.trim() || state.learningCommand;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
