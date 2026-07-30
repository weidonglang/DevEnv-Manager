import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { localize, t } from "../../core/i18n";
import type { OperationResult, RuntimeSwitchBackupSummary, RuntimeSwitchResult } from "../../types";
import { bindAction } from "../sharedView";
import { cancelRuntimeSwitchPlan, createRuntimeSwitchPlan, discoverRuntimes, executeRuntimeSwitchPlan, exportRuntimeSwitchPlan, exportRuntimeVerificationReport, getJdkDistributions, inspectRuntimeStrongVerification, installRuntime, listRuntimeSwitchBackups, openAppsFeatures, openRuntimeDirectory, restoreRuntimeSwitchBackup, uninstallRuntime, verifyExternalJdk } from "./api";
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
  context.root.querySelector<HTMLSelectElement>("#runtime-switch-backup")?.addEventListener("change", (event) => {
    const backupId = (event.currentTarget as HTMLSelectElement).value;
    const backup = state.switchBackups.find((item) => item.backupId === backupId && item.restorable);
    state.switchBackupId = backup?.backupId ?? "";
    state.switchBackupPath = backup?.backupPath ?? "";
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
  bindAction(context.root, "cancel-runtime-switch-plan", async () => {
    const planId = state.switchPlan?.planId;
    ++state.switchRequestId;
    state.operationResult = "";
    state.operationError = "";
    try {
      if (planId) await cancelRuntimeSwitchPlan(planId);
      if (!context.isCurrent()) return;
      state.switchPlan = null;
      state.switchResult = null;
      state.switchPhase = "idle";
      state.switchFailureStage = "";
      state.switchInlineError = "";
      state.switchInlineMessage = localize("The pending plan was cancelled. The selected target remains available for recreation.", "待执行计划已取消；所选目标仍保留，可重新创建计划。");
      state.switchNextStep = localize("Review the target and choose Recreate plan when ready.", "核对目标后，选择“重新创建计划”。");
      state.operationResult = state.switchInlineMessage;
    } catch (error) {
      if (!context.isCurrent()) return;
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = errorMessage(error);
      state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
      state.operationError = state.switchInlineError;
    }
    renderAndBind(context, state);
    focusSwitchWorkflow(context);
  });
  bindAction(context.root, "recreate-runtime-switch-plan", async () => {
    if (!state.switchTargetRuntimeId || !state.switchTargetMode) {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = localize("Select an eligible runtime before recreating a plan.", "重新创建计划前，请先选择可采用的运行时。");
      state.switchNextStep = localize("Run the health check, then select Set as current on an eligible row.", "请先运行健康检查，再在符合条件的行上选择“设为当前”。");
      renderAndBind(context, state);
      return;
    }
    const previousPlanId = state.switchPlan?.planId;
    if (previousPlanId) {
      try {
        await cancelRuntimeSwitchPlan(previousPlanId);
      } catch (error) {
        state.switchPhase = "failed";
        state.switchFailureStage = "planning";
        state.switchInlineError = errorMessage(error);
        state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
        state.operationError = state.switchInlineError;
        renderAndBind(context, state);
        return;
      }
    }
    await requestRuntimeSwitchPlan(
      context,
      state,
      state.switchTargetRuntimeId,
      state.switchTargetMode,
      state.switchTargetLabel,
      state.switchTargetRoot,
    );
  });
  bindAction(context.root, "export-runtime-switch-plan", async () => {
    const planId = state.switchPlan?.planId;
    if (!planId) {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = localize("Create a plan before exporting it.", "请先创建计划，再执行导出。");
      state.switchNextStep = localize("Select an eligible runtime or recreate the selected target plan.", "请选择可采用的运行时，或重新创建当前目标计划。");
      renderAndBind(context, state);
      return;
    }
    try {
      const path = await exportRuntimeSwitchPlan(planId);
      state.operationError = "";
      state.operationResult = localize(`Runtime switch plan exported: ${path}`, `运行时切换计划已导出：${path}`);
      state.switchInlineMessage = state.operationResult;
      state.switchNextStep = localize("Review the exported copy or continue with the on-screen plan.", "可审阅导出副本，或继续处理页面内计划。");
    } catch (error) {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = errorMessage(error);
      state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
      state.operationError = state.switchInlineError;
    }
    renderAndBind(context, state);
    focusSwitchWorkflow(context);
  });
  bindAction(context.root, "view-runtime-switch-diff", () => focusSwitchPlanPreview(context));
  bindAction(context.root, "restore-runtime-switch-backup", async () => {
    const backupId = state.switchBackupId;
    if (!backupId) {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = localize("Create a runtime switch plan before restoring its backup.", "请先创建运行时切换计划，再恢复对应备份。");
      state.switchNextStep = localize("Select an eligible runtime and review its plan.", "请选择可采用的运行时并审阅计划。");
      renderAndBind(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "restore_runtime_switch_backup",
        actionId: "restore_runtime_switch_backup",
        planId: backupId,
        riskLevel: "high",
        backupRequired: true,
        backupReceipt: backupId,
        title: localize("Restore runtime switch backup", "恢复运行时切换备份"),
        summary: localize("Restore the saved user environment, managed pointer, provider state and project selection where applicable.", "恢复已保存的用户环境、受管指针、提供方状态和适用的项目选择。"),
        before: [
          { label: localize("Backup ID", "备份 ID"), value: backupId },
          { label: localize("Backup path", "备份路径"), value: state.switchBackupPath },
        ],
        warnings: [
          localize("A new safety backup is created before restore.", "恢复前会再创建一份安全备份。"),
          localize("Open terminals and IDEs keep their existing process environment until restarted.", "已打开的终端和 IDE 会保留原进程环境，直至重启。"),
        ],
        execute: (confirmationToken) => restoreRuntimeSwitchBackup(backupId, confirmationToken),
      }) as OperationResult;
      if (state.switchPlan) {
        await cancelRuntimeSwitchPlan(state.switchPlan.planId).catch(() => undefined);
      }
      state.switchPlan = null;
      state.switchResult = null;
      state.switchPhase = "succeeded";
      state.switchFailureStage = "";
      state.switchInlineError = "";
      state.switchInlineMessage = result.message;
      state.switchNextStep = localize("Restart terminals and IDEs, then verify the restored command versions.", "请重启终端和 IDE，然后验证恢复后的命令版本。");
      state.operationError = "";
      state.operationResult = result.message;
      await reloadRuntimeData(state);
    } catch (error) {
      state.switchPhase = "failed";
      state.switchFailureStage = "execution";
      state.switchInlineError = errorMessage(error);
      state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
      state.operationError = state.switchInlineError;
    }
    renderAndBind(context, state);
    focusSwitchWorkflow(context);
  });
  bindAction(context.root, "execute-runtime-switch-plan", async () => {
    const plan = state.switchPlan;
    if (!plan) {
      state.operationError = localize("Create a runtime switch plan first.", "请先创建运行时切换计划。");
      renderAndBind(context, state);
      return;
    }
    const requestId = ++state.switchRequestId;
    state.switchPhase = "executing";
    state.switchFailureStage = "";
    state.switchInlineMessage = localize("Executing the reviewed plan and verifying the result...", "正在执行已审阅计划并验证结果...");
    state.switchInlineError = "";
    state.switchNextStep = "";
    state.operationResult = "";
    state.operationError = "";
    renderAndBind(context, state);
    try {
      const result = await context.risk.run({
        command: "execute_runtime_switch_plan",
        actionId: "execute_runtime_switch_plan",
        planId: plan.planId,
        planFingerprint: plan.planFingerprint,
        riskLevel: plan.riskLevel,
        backupReceipt: plan.backupName,
        title: t("feature.runtimes.switchTitle", { name: plan.kind, version: plan.version }),
        summary: localize("Apply the reviewed runtime selection through its allowed mode, then run command-level verification and roll back on failure.", "按允许的模式应用已审阅的运行时选择，随后执行命令级验证，失败时自动回滚。"),
        before: [
          { label: localize("Switch mode", "切换模式"), value: plan.switchMode },
          { label: localize("Source authority", "来源权限"), value: plan.sourceAuthority },
          { label: localize("Previous version", "原版本"), value: plan.previousVersion || t("state.notAvailable") },
          { label: localize("Target root", "目标目录"), value: plan.targetRoot },
          { label: localize("Environment backup", "环境备份"), value: plan.backupName },
        ],
        warnings: plan.warnings,
        execute: (confirmationToken) => executeRuntimeSwitchPlan(plan.planId, confirmationToken),
      }) as RuntimeSwitchResult;
      if (!context.isCurrent() || requestId !== state.switchRequestId) return;
      state.switchResult = result;
      state.switchBackupId = result.backupId;
      state.switchBackupPath = result.backupPath;
      state.switchPlan = null;
      state.switchPhase = "succeeded";
      state.switchFailureStage = "";
      state.switchInlineMessage = localize(
        result.message,
        `运行时已通过 ${result.selectionScope} 模式完成切换并验证；备份 ${result.backupName} 仍可恢复。`,
      );
      state.switchNextStep = localize("Restart terminals and IDEs, then confirm the effective command version. The unified switch backup remains available here.", "请重启终端和 IDE 后确认实际命令版本；统一切换备份仍可在此恢复。");
      state.operationResult = state.switchInlineMessage;
      await reloadRuntimeData(state);
    } catch (error) {
      if (!context.isCurrent() || requestId !== state.switchRequestId) return;
      state.switchPhase = "failed";
      state.switchFailureStage = "execution";
      state.switchInlineError = errorMessage(error);
      state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
      state.operationError = state.switchInlineError;
    }
    renderAndBind(context, state);
    focusSwitchWorkflow(context);
  });
  bindAction(context.root, "choose-runtime-project", async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    state.runtimeProjectRoot = selected;
    if (!state.switchTargetRuntimeId || state.switchTargetMode !== "project") {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = localize("Select a .NET SDK target before choosing its project.", "请先选择目标 .NET SDK，再选择项目目录。");
      renderAndBind(context, state);
      return;
    }
    await requestRuntimeSwitchPlan(
      context,
      state,
      state.switchTargetRuntimeId,
      "project",
      state.switchTargetLabel,
      state.switchTargetRoot,
    );
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
  const [runtimes, distributions, strongVerification, switchBackups] = await loadRuntimeData();
  if (!context.isCurrent()) return;
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
  applyRuntimeSwitchBackups(state, switchBackups);
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
  const runtimeId = button.dataset.runtimeId || "";
  const switchMode = button.dataset.runtimeSwitchMode || "";
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
    if (!runtimeId || !isRuntimeSwitchMode(switchMode)) {
      state.switchPhase = "failed";
      state.switchFailureStage = "planning";
      state.switchInlineError = localize("This runtime does not expose a trusted switch identity or mode.", "此运行时没有可信的切换身份或模式。");
      state.operationError = state.switchInlineError;
      renderAndBind(context, state);
      return;
    }
    state.switchTargetRuntimeId = runtimeId;
    state.switchTargetMode = switchMode;
    state.switchTargetLabel = `${label} ${version}`;
    state.switchTargetRoot = path || executable;
    if (switchMode === "project" && !state.runtimeProjectRoot) {
      state.switchPhase = "idle";
      state.switchFailureStage = "";
      state.switchPlan = null;
      state.switchInlineError = "";
      state.switchInlineMessage = localize("Choose the project directory to create a project-scoped .NET SDK plan.", "请选择项目目录以创建项目级 .NET SDK 计划。");
      renderAndBind(context, state);
      focusSwitchWorkflow(context);
      return;
    }
    await requestRuntimeSwitchPlan(context, state, runtimeId, switchMode, `${label} ${version}`, path || executable);
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
    listRuntimeSwitchBackups(),
  ]);
}

async function reloadRuntimeData(state: RuntimeWorkbenchState): Promise<void> {
  const [runtimes, distributions, strongVerification, switchBackups] = await loadRuntimeData();
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
  applyRuntimeSwitchBackups(state, switchBackups);
}

function applyRuntimeSwitchBackups(state: RuntimeWorkbenchState, switchBackups: RuntimeSwitchBackupSummary[]): void {
  state.switchBackups = switchBackups;
  const selectedBackup = switchBackups.find(
    (backup) => backup.backupId === state.switchBackupId && backup.restorable,
  ) ?? switchBackups.find((backup) => backup.restorable);
  state.switchBackupId = selectedBackup?.backupId ?? "";
  state.switchBackupPath = selectedBackup?.backupPath ?? "";
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

async function requestRuntimeSwitchPlan(
  context: FeatureContext,
  state: RuntimeWorkbenchState,
  runtimeId: string,
  switchMode: "managed" | "external-user" | "provider" | "project",
  targetLabel: string,
  targetRoot: string,
): Promise<void> {
  const requestId = ++state.switchRequestId;
  state.operationResult = "";
  state.operationError = "";
  state.switchResult = null;
  state.switchPlan = null;
  state.switchPhase = "planning";
  state.switchFailureStage = "";
  state.switchTargetRuntimeId = runtimeId;
  state.switchTargetMode = switchMode;
  state.switchTargetLabel = targetLabel;
  state.switchTargetRoot = targetRoot;
  state.switchInlineMessage = localize("Creating a trusted plan. You can continue reviewing this row while the backend verifies the target.", "正在创建可信计划；后端验证目标期间可继续查看此行。");
  state.switchInlineError = "";
  state.switchNextStep = "";
  renderAndBind(context, state);
  try {
    const plan = await createRuntimeSwitchPlan(
      runtimeId,
      switchMode,
      switchMode === "project" ? state.runtimeProjectRoot : null,
    );
    if (!context.isCurrent() || requestId !== state.switchRequestId) return;
    state.switchPlan = plan;
    state.switchBackupId = plan.backupId;
    state.switchBackupPath = plan.backupPath;
    state.switchBackups = await listRuntimeSwitchBackups();
    state.switchTargetRoot = plan.targetRoot;
    state.switchPhase = "planReady";
    state.switchFailureStage = "";
    state.switchInlineMessage = localize("Runtime switch plan created. Review the backup, authority and environment diff before execution.", "运行时切换计划已创建，请在执行前审阅备份、来源权限和环境差异。");
    state.operationResult = state.switchInlineMessage;
  } catch (error) {
    if (!context.isCurrent() || requestId !== state.switchRequestId) return;
    state.switchPlan = null;
    state.switchPhase = "failed";
    state.switchFailureStage = "planning";
    state.switchInlineMessage = "";
    state.switchInlineError = errorMessage(error);
    state.switchNextStep = runtimeSwitchNextStep(state.switchInlineError);
    state.operationError = state.switchInlineError;
  }
  renderAndBind(context, state);
  focusSwitchWorkflow(context);
}

function focusSwitchWorkflow(context: FeatureContext): void {
  requestAnimationFrame(() => {
    if (!context.isCurrent()) return;
    const target = context.root.querySelector<HTMLElement>('[data-testid="runtime-switch-workflow"]');
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  });
}

function focusSwitchPlanPreview(context: FeatureContext): void {
  requestAnimationFrame(() => {
    if (!context.isCurrent()) return;
    const target = context.root.querySelector<HTMLElement>('[data-testid="runtime-switch-plan-preview"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  });
}

function runtimeSwitchNextStep(error: string): string {
  const value = error.toLowerCase();
  if (value.includes("expired") || value.includes("过期")) {
    return localize("Choose Recreate plan, review the new fingerprint, then execute it.", "请选择“重新创建计划”，审阅新的指纹后再执行。");
  }
  if (value.includes("state") || value.includes("changed") || value.includes("变化")) {
    return localize("Refresh runtimes and recreate the plan because the trusted state changed.", "可信状态已经变化，请刷新运行时并重新创建计划。");
  }
  if (value.includes("verif") || value.includes("校验") || value.includes("验证")) {
    return localize("Run Reverify, resolve the failed required check, then recreate the plan.", "请重新验证并解决必需检查失败项，然后重新创建计划。");
  }
  return localize("Keep this error visible, verify the target, and recreate the plan. Restore the unified switch backup here if execution changed state.", "请保留此错误，重新验证目标并创建计划；若执行已改变状态，可在此恢复统一切换备份。");
}

function isRuntimeSwitchMode(value: string): value is "managed" | "external-user" | "provider" | "project" {
  return ["managed", "external-user", "provider", "project"].includes(value);
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
