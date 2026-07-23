import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { localize, t } from "../../core/i18n";
import type { RuntimeSwitchResult } from "../../types";
import { bindAction } from "../sharedView";
import { createRuntimeSwitchPlan, discoverRuntimes, executeRuntimeSwitchPlan, exportRuntimeVerificationReport, getJdkDistributions, inspectRuntimeStrongVerification, installRuntime, openAppsFeatures, openRuntimeDirectory, uninstallRuntime, verifyExternalJdk } from "./api";
import { renderRuntimeWorkbench } from "./render";
import type { RuntimeWorkbenchState } from "./state";

export function bindRuntimeEvents(context: FeatureContext, state: RuntimeWorkbenchState): void {
  bindAction(context.root, "refresh-runtimes", () => refreshRuntimes(context, state));
  context.root.querySelector<HTMLSelectElement>("#external-jdk-candidate")?.addEventListener("change", (event) => {
    state.externalJdkPath = (event.currentTarget as HTMLSelectElement).value;
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "choose-external-jdk", async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    state.externalJdkPath = normalizeJdkRoot(selected);
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "verify-external-jdk", async () => {
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    if (!state.externalJdkPath) {
      state.externalJdkError = localize("Select or choose an external JDK root first.", "请先选择或浏览外部 JDK 根目录。");
      renderAndBind(context, state);
      return;
    }
    context.progress.start(t("feature.runtimes.verifyingExternalJdk"));
    try {
      state.externalJdkChecks = await verifyExternalJdk(state.externalJdkPath);
      const requiredPassed = state.externalJdkChecks.filter((check) => check.required).every((check) => check.success);
      state.externalJdkResult = requiredPassed
        ? localize(`External JDK verified. JAVA_HOME can point to ${state.externalJdkPath}.`, `外部 JDK 验证通过，JAVA_HOME 可以指向 ${state.externalJdkPath}。`)
        : localize("External Java verification completed with missing or failed required tools.", "外部 Java 验证已完成，但必需工具缺失或验证失败。");
      context.progress.done(t("feature.runtimes.externalJdkVerificationDone"));
    } catch (error) {
      state.externalJdkError = errorMessage(error);
      context.progress.fail(state.externalJdkError);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "install-jdk", async () => {
    const version = context.root.querySelector<HTMLSelectElement>("#jdk-version")?.value || "21";
    const distribution = context.root.querySelector<HTMLSelectElement>("#jdk-distribution")?.value || "temurin";
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "install_jdk",
        planId: `install_jdk:${version}:${distribution}`,
        riskLevel: "high",
        backupRequired: false,
        title: t("feature.runtimes.installJdkTitle", { version }),
        summary: t("feature.runtimes.installJdkSummary", { version }),
        before: [
          { label: t("feature.runtimes.distribution"), value: distribution },
          { label: t("feature.runtimes.version"), value: version },
        ],
        warnings: [
          t("feature.runtimes.installJdkWhy"),
          t("feature.runtimes.installJdkBackup"),
          t("feature.runtimes.installJdkVerify"),
        ],
        execute: (confirmationToken) => installRuntime("install_jdk", { version, distribution, switchAfterInstall: false, confirmationToken }),
      });
      state.operationResult = resultMessage(result, t("feature.runtimes.installJdk"));
      await reloadRuntimeData(state);
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "install-node", () => installWithRisk(context, state, "install_node", context.root.querySelector<HTMLSelectElement>("#node-version")?.value || "22"));
  bindAction(context.root, "install-python", () => installWithRisk(context, state, "install_python", context.root.querySelector<HTMLSelectElement>("#python-version")?.value || "3.12"));
  bindAction(context.root, "install-go", () => installWithRisk(context, state, "install_go", context.root.querySelector<HTMLSelectElement>("#go-version")?.value || "1.25"));
  bindAction(context.root, "install-maven", () => installSelectedWithRisk(context, state, "install_maven", "Maven", context.root.querySelector<HTMLSelectElement>("#maven-version")?.value || "latest"));
  bindAction(context.root, "install-gradle", () => installSelectedWithRisk(context, state, "install_gradle", "Gradle", context.root.querySelector<HTMLSelectElement>("#gradle-version")?.value || "latest"));
  bindAction(context.root, "export-runtime-report", async () => {
    state.operationResult = "";
    state.operationError = "";
    context.progress.start(localize("Exporting runtime verification report", "正在导出运行时验证报告"));
    try {
      const path = await exportRuntimeVerificationReport("markdown");
      state.operationResult = localize(`Runtime verification report exported: ${path}`, `运行时验证报告已导出：${path}`);
      context.progress.done(state.operationResult);
    } catch (error) {
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "execute-runtime-switch-plan", async () => {
    const plan = state.switchPlan;
    if (!plan) {
      state.operationError = localize("Create a runtime switch plan first.", "请先创建运行时切换计划。");
      renderAndBind(context, state);
      return;
    }
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "execute_runtime_switch_plan",
        actionId: "execute_runtime_switch_plan",
        planId: plan.planId,
        planFingerprint: plan.planFingerprint,
        riskLevel: "medium",
        backupReceipt: plan.backupName,
        title: t("feature.runtimes.switchTitle", { name: plan.kind, version: plan.version }),
        summary: localize("Switch the reviewed managed runtime, update the current pointer and user environment, then run command-level verification.", "切换已审阅的受管运行时，更新 current 指针和用户环境，并执行命令级强校验。"),
        before: [
          { label: localize("Previous version", "原版本"), value: plan.previousVersion || t("state.notAvailable") },
          { label: localize("Target root", "目标目录"), value: plan.targetRoot },
          { label: localize("Environment backup", "环境备份"), value: plan.backupName },
        ],
        warnings: plan.warnings,
        execute: (confirmationToken) => executeRuntimeSwitchPlan(plan.planId, confirmationToken),
      }) as RuntimeSwitchResult;
      state.switchResult = result;
      state.switchPlan = null;
      state.operationResult = result.message;
      await reloadRuntimeData(state);
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "verify-runtimes", async () => {
    context.progress.start(t("feature.runtimes.healthCheck"));
    state.operationResult = "";
    state.operationError = "";
    try {
      state.strongVerification = await inspectRuntimeStrongVerification();
      state.operationResult = t("feature.runtimes.healthCheckDone");
      if (!context.isCurrent()) return;
      context.progress.done(t("feature.runtimes.healthCheckDone"));
    } catch (error) {
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
    }
    renderAndBind(context, state);
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-runtime-action]").forEach((button) => {
    button.addEventListener("click", () => runRuntimeRowAction(context, state, button));
  });
}

export async function refreshRuntimes(context: FeatureContext, state: RuntimeWorkbenchState): Promise<void> {
  const [runtimes, distributions, strongVerification] = await loadRuntimeData();
  if (!context.isCurrent()) return;
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
}

async function installWithRisk(context: FeatureContext, state: RuntimeWorkbenchState, command: "install_node" | "install_python" | "install_go", version: string) {
  state.operationResult = "";
  state.operationError = "";
  try {
    const result = await context.risk.run({
      command,
      planId: `${command}:${version}`,
      riskLevel: "high",
      title: t("feature.runtimes.installGenericTitle", { name: runtimeName(command), version }),
      summary: t("feature.runtimes.installGenericSummary"),
      warnings: [t("feature.runtimes.installGenericWarning")],
      execute: (confirmationToken) => installRuntime(command, { version, confirmationToken }),
    });
    state.operationResult = resultMessage(result, t("feature.runtimes.installGenericTitle", { name: runtimeName(command), version }));
    await reloadRuntimeData(state);
  } catch (error) {
    state.operationError = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function installSelectedWithRisk(context: FeatureContext, state: RuntimeWorkbenchState, command: "install_maven" | "install_gradle", label: string, version: string) {
  state.operationResult = "";
  state.operationError = "";
  try {
    const result = await context.risk.run({
      command,
      planId: `${command}:${version}`,
      riskLevel: "high",
      title: t("feature.runtimes.installGenericTitle", { name: label, version }),
      summary: t("feature.runtimes.installGenericSummary"),
      before: [{ label: t("feature.runtimes.version"), value: version === "latest" ? t("feature.runtimes.latest") : version }],
      warnings: [t("feature.runtimes.installGenericWarning")],
      execute: (confirmationToken) => installRuntime(command, { version, confirmationToken }),
    });
    state.operationResult = resultMessage(result, t("feature.runtimes.installGenericTitle", { name: label, version }));
    await reloadRuntimeData(state);
  } catch (error) {
    state.operationError = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function runRuntimeRowAction(context: FeatureContext, state: RuntimeWorkbenchState, button: HTMLButtonElement): Promise<void> {
  const action = button.dataset.runtimeAction;
  const kind = button.dataset.runtimeKind || "";
  const label = button.dataset.runtimeLabel || kind;
  const version = button.dataset.runtimeVersion || "";
  const path = button.dataset.runtimePath || "";
  const executable = button.dataset.runtimeExecutable || path;

  if (action === "details") {
    const rows = Array.from(context.root.querySelectorAll<HTMLElement>("[data-runtime-row]"));
    state.selectedRuntimeId = rows.find((row) => row.contains(button))?.dataset.runtimeRow ?? null;
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderRuntimeWorkbench(state);
    bindRuntimeEvents(context, state);
    return;
  }

  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(executable);
      state.operationResult = `${t("toast.runtimePathCopied")}: ${executable}`;
      state.operationError = "";
      context.toast(t("toast.runtimePathCopied"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "open") {
    try {
      const result = await openRuntimeDirectory(path || executable);
      state.operationResult = result.message || t("toast.runtimeOpened");
      state.operationError = "";
      context.toast(result.message || t("toast.runtimeOpened"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "health") {
    context.progress.start(t("feature.runtimes.healthCheck"));
    try {
      const report = await inspectRuntimeStrongVerification();
      if (!context.isCurrent()) return;
      state.strongVerification = report;
      state.operationResult = t("feature.runtimes.healthCheckDone");
      state.operationError = "";
      context.progress.done(t("feature.runtimes.healthCheckDone"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "system") {
    try {
      await navigator.clipboard.writeText(`${label} ${version}\n${executable}`);
      const result = await openAppsFeatures();
      state.operationResult = result.message || t("feature.runtimes.externalSystemUninstallHint");
      state.operationError = "";
      context.toast(result.message || t("feature.runtimes.externalSystemUninstallHint"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "switch") {
    state.operationResult = "";
    state.operationError = "";
    state.switchResult = null;
    try {
      state.switchPlan = await createRuntimeSwitchPlan(kind, version, path);
      state.operationResult = localize("Runtime switch plan created. Review the backup and environment diff before execution.", "运行时切换计划已创建，请检查备份和环境差异后再执行。");
    } catch (error) {
      state.switchPlan = null;
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "uninstall") {
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "uninstall_runtime",
        planId: `${kind}:${version}:${path}`,
        riskLevel: "high",
        title: t("feature.runtimes.uninstallTitle", { name: label, version }),
        summary: t("feature.runtimes.uninstallSummary"),
        warnings: [t("feature.runtimes.uninstallWarning")],
        execute: (confirmationToken) => uninstallRuntime(kind, version, path, confirmationToken),
      });
      state.operationResult = resultMessage(result, t("feature.runtimes.uninstallTitle", { name: label, version }));
      await reloadRuntimeData(state);
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  }
}

async function loadRuntimeData() {
  return Promise.all([
    discoverRuntimes(),
    getJdkDistributions(),
    inspectRuntimeStrongVerification(),
  ]);
}

async function reloadRuntimeData(state: RuntimeWorkbenchState): Promise<void> {
  const [runtimes, distributions, strongVerification] = await loadRuntimeData();
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
}

function runtimeName(command: "install_node" | "install_python" | "install_go"): string {
  if (command === "install_node") return "Node.js";
  if (command === "install_python") return "Python";
  return "Go";
}

function normalizeJdkRoot(path: string): string {
  const normalized = path.replace(/\//g, "\\").replace(/\\+$/, "");
  return normalized.toLowerCase().endsWith("\\bin") ? normalized.slice(0, -4) : normalized;
}

function renderAndBind(context: FeatureContext, state: RuntimeWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
