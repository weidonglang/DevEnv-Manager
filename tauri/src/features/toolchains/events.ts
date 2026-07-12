import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { createMySqlRepairPlan, executeMySqlRepairPlan, inspectCommandSafety, inspectLocalServices, inspectMySqlRepair, inspectPlatformToolchains, inspectSystemPlatforms, inspectToolchains, localServiceLogs, manageLocalService, manageSystemPlatform, openDockerDesktop, openLocalServiceDirectory, openServiceLogPath, runLearningCheck } from "./api";
import type { LocalServiceStatus, OperationResult } from "../../types";
import { renderToolchainWorkbench } from "./render";
import type { ToolchainWorkbenchState } from "./state";
import { reconcileServiceSelection, serviceDirectoryError, serviceManagementError } from "./serviceSelection";

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
      normalizePlatformAction(state);
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
      const services = await inspectLocalServices();
      if (!context.isCurrent()) return;
      updateServicesAfterRefresh(state, services);
      delete state.errors.services;
      context.progress.done(t("feature.toolchains.checkDone"));
    } catch (error) {
      state.errors.services = errorMessage(error);
      context.progress.fail(state.errors.services);
    }
    renderAndBind(context, state);
  });
  bindServiceControls(context, state);
  bindPlatformControls(context, state);
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
  if (system.status === "fulfilled") {
    state.system = system.value;
    normalizePlatformAction(state);
  }
  else state.errors.system = errorMessage(system.reason);
  if (services.status === "fulfilled") updateServicesAfterRefresh(state, services.value);
  else state.errors.services = errorMessage(services.reason);
  if (mysql.status === "fulfilled") state.mysql = mysql.value;
  else state.errors.mysql = errorMessage(mysql.reason);
  if (Object.keys(state.errors).length) context.progress.fail(t("feature.toolchains.checkPartialFailed"));
  else context.progress.done(t("feature.toolchains.checkDone"));
  renderAndBind(context, state);
}

function bindPlatformControls(context: FeatureContext, state: ToolchainWorkbenchState): void {
  context.root.querySelector<HTMLSelectElement>("#platform-action")?.addEventListener("change", (event) => {
    state.platformAction = (event.currentTarget as HTMLSelectElement).value;
    state.platformOperationResult = null;
    state.platformOperationError = "";
    state.platformVerification = "";
    renderAndBind(context, state);
  });
  context.root.querySelector<HTMLInputElement>("#platform-value")?.addEventListener("input", (event) => {
    state.platformValue = (event.currentTarget as HTMLInputElement).value;
  });
  context.root.querySelector<HTMLSelectElement>("#platform-distro")?.addEventListener("change", (event) => {
    state.platformValue = (event.currentTarget as HTMLSelectElement).value;
    renderAndBind(context, state);
  });
  bindAction(context.root, "open-docker-desktop", async () => {
    state.dockerOpenResult = "";
    state.dockerOpenError = "";
    try {
      const result = await openDockerDesktop();
      state.dockerOpenResult = result.message;
    } catch (error) {
      state.dockerOpenError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "execute-platform-action", async () => {
    const action = state.platformAction;
    const value = platformActionValue(state);
    if (platformActionNeedsValue(action) && !value) {
      state.platformOperationError = "Select or enter a WSL distribution before creating this operation.";
      renderAndBind(context, state);
      return;
    }
    state.platformOperationResult = null;
    state.platformOperationError = "";
    state.platformVerification = "";
    try {
      const result = await context.risk.run({
        command: "manage_system_platform",
        planId: `${action}:${value ?? ""}`,
        riskLevel: "high",
        title: "Manage system platform",
        summary: `Execute ${action} for ${value || platformActionTarget(action)} after reviewing the persistent preview.`,
        warnings: ["Installation, update, shutdown, and WSL state changes can affect active development workloads."],
        execute: (confirmationToken) => manageSystemPlatform(action, value, confirmationToken),
      });
      state.platformOperationResult = result as OperationResult;
      state.system = await inspectSystemPlatforms();
      state.platformVerification = platformVerification(state, action, value);
    } catch (error) {
      state.platformOperationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
}

function bindServiceControls(context: FeatureContext, state: ToolchainWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-service-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedServiceId = button.dataset.serviceSelect || "";
      clearServiceOperationState(state);
      renderAndBind(context, state);
    });
  });
  context.root.querySelector<HTMLSelectElement>("#service-action")?.addEventListener("change", (event) => {
    state.serviceAction = (event.currentTarget as HTMLSelectElement).value as ToolchainWorkbenchState["serviceAction"];
    state.serviceOperationResult = null;
    state.serviceOperationError = "";
    state.serviceVerification = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "manage-local-service", async () => {
    const selectedId = state.selectedServiceId;
    if (!selectedId) {
      state.serviceOperationError = "Select a service row before creating a management operation.";
      renderAndBind(context, state);
      return;
    }
    state.serviceOperationResult = null;
    state.serviceOperationError = "";
    state.serviceVerification = "";
    try {
      const refreshed = await inspectLocalServices();
      updateServicesAfterRefresh(state, refreshed);
      const service = selectedService(state);
      if (!service) throw new Error("The selected service disappeared during the pre-execution refresh. Select another row.");
      const validationError = serviceManagementError(service);
      if (validationError) throw new Error(validationError);
      const action = state.serviceAction;
      const result = await context.risk.run({
        command: "manage_local_service",
        planId: `${service.serviceName}:${action}`,
        riskLevel: "high",
        title: `Manage ${service.name}`,
        summary: `${action} Windows service ${service.serviceName}; current state ${service.serviceState}; PID ${service.pid || "none"}.`,
        warnings: ["Existing database connections may be interrupted. The backend revalidates the service allowlist before execution."],
        execute: (confirmationToken) => manageLocalService(service.serviceName, action, confirmationToken),
      });
      state.serviceOperationResult = result as OperationResult;
      const verified = await inspectLocalServices();
      updateServicesAfterRefresh(state, verified);
      const after = selectedService(state);
      state.serviceVerification = after
        ? `Post-execution verification: ${after.serviceName} is ${after.serviceState}; PID ${after.pid || "none"}.`
        : "Post-execution verification: the selected service is no longer present in the inspected list.";
    } catch (error) {
      state.serviceOperationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "open-service-directory", () => runServiceDirectoryAction(context, state, "open"));
  bindAction(context.root, "copy-service-directory", () => runServiceDirectoryAction(context, state, "copy"));
  bindAction(context.root, "inspect-service-logs", () => runServiceLogAction(context, state, "inspect"));
  bindAction(context.root, "open-service-log", () => runServiceLogAction(context, state, "open"));
  bindAction(context.root, "copy-service-log", () => runServiceLogAction(context, state, "copy"));
}

async function runServiceDirectoryAction(context: FeatureContext, state: ToolchainWorkbenchState, action: "open" | "copy"): Promise<void> {
  state.servicePathResult = "";
  state.servicePathError = "";
  const service = selectedService(state);
  const validationError = serviceDirectoryError(service);
  if (validationError) {
    state.servicePathError = validationError;
  } else if (service) {
    try {
      if (action === "open") {
        const result = await openLocalServiceDirectory(service.serviceName);
        state.servicePathResult = result.message;
      } else {
        await navigator.clipboard.writeText(service.installDirectory);
        state.servicePathResult = `Copied installation directory: ${service.installDirectory}`;
      }
    } catch (error) {
      state.servicePathError = errorMessage(error);
    }
  }
  renderAndBind(context, state);
}

async function runServiceLogAction(context: FeatureContext, state: ToolchainWorkbenchState, action: "inspect" | "open" | "copy"): Promise<void> {
  state.serviceLogError = "";
  const service = selectedService(state);
  if (!service) {
    state.serviceLogError = "Select a service row before inspecting its logs.";
  } else {
    try {
      if (action === "inspect") {
        state.serviceLogText = await localServiceLogs(service.serviceName);
      } else if (!service.logPath) {
        state.serviceLogError = service.logPathReason || "The backend did not return a verified log path.";
      } else if (action === "open") {
        const result = await openServiceLogPath(service.logPath);
        state.serviceLogText = result.message;
      } else {
        await navigator.clipboard.writeText(service.logPath);
        state.serviceLogText = `Copied log path: ${service.logPath}`;
      }
    } catch (error) {
      state.serviceLogError = errorMessage(error);
    }
  }
  renderAndBind(context, state);
}

function selectedService(state: ToolchainWorkbenchState): LocalServiceStatus | undefined {
  return state.services.find((service) => service.id === state.selectedServiceId);
}

function updateServicesAfterRefresh(state: ToolchainWorkbenchState, services: LocalServiceStatus[]): void {
  const selectedId = state.selectedServiceId;
  state.services = services;
  const selection = reconcileServiceSelection(services, selectedId);
  state.selectedServiceId = selection.selectedId;
  if (selection.selectionLost) {
    state.serviceOperationError = "The previously selected service disappeared after refresh. Select a current row before continuing.";
  }
}

function clearServiceOperationState(state: ToolchainWorkbenchState): void {
  state.serviceOperationResult = null;
  state.serviceOperationError = "";
  state.serviceVerification = "";
  state.serviceLogText = "";
  state.serviceLogError = "";
  state.servicePathResult = "";
  state.servicePathError = "";
}

function platformActionNeedsValue(action: string): boolean {
  return ["wsl_install_distro", "wsl_start", "wsl_terminate", "wsl_set_default"].includes(action);
}

function platformActionValue(state: ToolchainWorkbenchState): string | null {
  if (!platformActionNeedsValue(state.platformAction)) return null;
  return state.platformValue.trim() || state.system?.wslItems[0]?.name || null;
}

function platformActionTarget(action: string): string {
  return action.startsWith("docker_") ? "Docker Desktop" : "Windows Subsystem for Linux";
}

function platformVerification(state: ToolchainWorkbenchState, action: string, value: string | null): string {
  if (action.startsWith("docker_")) {
    return `Post-execution inspection: Docker Desktop path ${state.system?.dockerDesktopPath || "not detected"}; ${state.system?.dockerInfo || "no engine status"}.`;
  }
  const distro = value ? state.system?.wslItems.find((item) => item.name.toLowerCase() === value.toLowerCase()) : undefined;
  return `Post-execution inspection: WSL ${state.system?.wsl.installed ? "detected" : "not detected"}; ${distro ? `${distro.name} is ${distro.state}` : state.system?.wslStatus || "no distribution state detected"}.`;
}

function normalizePlatformAction(state: ToolchainWorkbenchState): void {
  if (!state.system?.dockerDesktopPath && state.platformAction === "docker_update") {
    state.platformAction = "docker_install";
  }
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
