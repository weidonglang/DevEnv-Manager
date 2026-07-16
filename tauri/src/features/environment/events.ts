import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { localize, t } from "../../core/i18n";
import { bindAction, valueOf } from "../sharedView";
import { analyzePythonEnvironment, applyEnvRepairPlan, applyPythonRepair, applyUserEnvironmentConfiguration, cleanupPathEntries, createJavaStabilizePlan, environmentHealth, inspectEnvBackup, inspectEnvironmentReliability, listEnvBackups, listEnvironmentBackups, openPythonAliasSettings, previewPythonRepair, previewUserEnvironmentConfiguration, restoreEnvBackup, restoreEnvironmentBackup } from "./api";
import { renderEnvironmentWorkbench } from "./render";
import type { EnvironmentWorkbenchState } from "./state";

export function bindEnvironmentEvents(context: FeatureContext, state: EnvironmentWorkbenchState): void {
  bindAction(context.root, "inspect-environment", () => refreshEnvironment(context, state));
  bindAction(context.root, "apply-user-environment-configuration", async () => {
    state.configurationResult = "";
    state.configurationError = "";
    const preview = state.preview;
    if (!preview) {
      state.configurationError = localize("Refresh the environment preview before applying configuration.", "应用配置前请先刷新环境预览。");
      renderAndBind(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "apply_user_environment_configuration",
        planId: preview.previewId,
        riskLevel: "high",
        backupReceipt: preview.backupName,
        backupRequired: true,
        title: localize("Apply user environment configuration", "应用用户环境配置"),
        summary: localize("Writes the previewed DEVENV_HOME, JAVA_HOME, and user PATH values after baseline verification.", "验证基线后写入预览中的 DEVENV_HOME、JAVA_HOME 和用户 PATH。"),
        before: preview.changes.map((change) => ({ label: change.name, value: `${change.current || localize("not set", "未设置")} -> ${change.proposed || localize("not set", "未设置")}` })),
        warnings: preview.warnings,
        execute: (confirmationToken) => applyUserEnvironmentConfiguration(preview.previewId, confirmationToken),
      });
      const [reliability, envBackups, environmentBackups, nextPreview] = await Promise.all([
        inspectEnvironmentReliability(),
        listEnvBackups(),
        listEnvironmentBackups(),
        previewUserEnvironmentConfiguration(),
      ]);
      state.reliability = reliability;
      state.envBackups = envBackups;
      state.environmentBackups = environmentBackups;
      state.preview = nextPreview;
      state.configurationResult = `${resultMessage(result, localize("User environment configuration applied.", "用户环境配置已应用。"))} ${localize("Post-verification refreshed JAVA_HOME, PATH, and backup evidence.", "执行后验证已刷新 JAVA_HOME、PATH 和备份证据。")}`;
    } catch (error) {
      state.configurationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "analyze-python-environment", async () => {
    state.pythonError = "";
    try {
      state.pythonAnalysis = await analyzePythonEnvironment();
    } catch (error) {
      state.pythonError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "open-python-alias-settings", async () => {
    state.aliasResult = "";
    state.aliasError = "";
    try {
      const result = await openPythonAliasSettings();
      state.aliasResult = result.message || localize("Windows execution alias settings opened.", "已打开 Windows 应用执行别名设置。");
    } catch (error) {
      state.aliasError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "preview-python-repair", async () => {
    state.pythonPlan = null;
    state.pythonResult = "";
    state.pythonError = "";
    const repairPip = Boolean(context.root.querySelector<HTMLInputElement>("#python-repair-pip")?.checked);
    const repairPath = Boolean(context.root.querySelector<HTMLInputElement>("#python-repair-path")?.checked);
    try {
      state.pythonPlan = await previewPythonRepair(repairPip, repairPath);
    } catch (error) {
      state.pythonError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "execute-python-repair", async () => {
    state.pythonResult = "";
    state.pythonError = "";
    if (!state.pythonPlan) {
      state.pythonError = localize("Create and review a Python repair preview first.", "请先创建并检查 Python 修复预览。");
      renderAndBind(context, state);
      return;
    }
    const plan = state.pythonPlan;
    try {
      const result = await context.risk.run({
        command: "apply_python_repair",
        planId: plan.planId,
        riskLevel: "high",
        backupReceipt: plan.backupName,
        title: localize("Apply Python health repair", "应用 Python 健康修复"),
        summary: localize("Runs the previewed pip repair and/or prepends Python paths after verifying the environment baseline.", "验证环境基线后执行预览中的 pip 修复和/或调整 Python PATH 顺序。"),
        before: [
          { label: "Python", value: plan.pythonPath },
          { label: localize("Actions", "操作"), value: plan.actions.join("; ") },
          { label: localize("PATH additions", "PATH 新增项"), value: plan.pathAdded.join("; ") || localize("none", "无") },
        ],
        warnings: plan.warnings,
        execute: (confirmationToken) => applyPythonRepair(plan.planId, confirmationToken),
      });
      const [analysis, reliability] = await Promise.all([analyzePythonEnvironment(), inspectEnvironmentReliability()]);
      state.pythonAnalysis = analysis;
      state.reliability = reliability;
      state.pythonResult = `${resultMessage(result, localize("Python repair completed.", "Python 修复完成。"))} ${localize("Post-verification refreshed Python ownership, aliases, and PATH evidence.", "执行后验证已刷新 Python 归属、别名和 PATH 证据。")}`;
      state.pythonPlan = null;
    } catch (error) {
      state.pythonError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  context.root.querySelector<HTMLSelectElement>("#environment-backup-select")?.addEventListener("change", (event) => {
    state.selectedBackupId = (event.currentTarget as HTMLSelectElement).value;
    state.restorePlan = null;
    state.backupDiff = null;
    state.restoreError = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "create-environment-restore-plan", () => createRestorePlan(context, state));
  bindAction(context.root, "execute-environment-restore", () => executeRestore(context, state));
  context.root.querySelector<HTMLSelectElement>("#java-plan-jdk-path")?.addEventListener("change", (event) => {
    state.selectedJdkRoot = normalizeJdkRoot((event.currentTarget as HTMLSelectElement).value.trim());
    state.createPlanFailure = null;
    delete state.errors.createPlan;
    context.root.innerHTML = renderEnvironmentWorkbench(state);
    bindEnvironmentEvents(context, state);
  });
  bindAction(context.root, "choose-jdk-root", async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) {
      context.toast(t("feature.environment.chooseJdkCancelled"));
      return;
    }
    state.selectedJdkRoot = normalizeJdkRoot(selected);
    state.plan = null;
    state.createPlanFailure = null;
    delete state.errors.createPlan;
    context.toast(t("feature.environment.jdkRootSelected"));
    context.root.innerHTML = renderEnvironmentWorkbench(state);
    bindEnvironmentEvents(context, state);
  });
  bindAction(context.root, "create-java-plan", async () => {
    const jdkPath = normalizeJdkRoot(state.selectedJdkRoot || context.root.querySelector<HTMLSelectElement>("#java-plan-jdk-path")?.value.trim() || "");
    if (!jdkPath) {
      state.errors.createPlan = t("feature.environment.selectJdkRootFirst");
      context.root.innerHTML = renderEnvironmentWorkbench(state);
      bindEnvironmentEvents(context, state);
      context.toast(t("feature.environment.selectJdkRootFirst"), true);
      return;
    }
    state.plan = null;
    state.createPlanFailure = null;
    delete state.errors.createPlan;
    context.progress.start(t("feature.environment.creatingJavaPlan"));
    try {
      state.plan = await createJavaStabilizePlan(jdkPath);
      delete state.errors.createPlan;
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderEnvironmentWorkbench(state);
      bindEnvironmentEvents(context, state);
    } catch (error) {
      state.errors.createPlan = errorMessage(error);
      state.createPlanFailure = environmentPlanFailure(state.errors.createPlan, jdkPath);
      context.progress.fail(state.errors.createPlan);
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderEnvironmentWorkbench(state);
      bindEnvironmentEvents(context, state);
    }
  });
  bindAction(context.root, "apply-java-plan", async () => {
    if (!state.plan) {
      state.applyResult = "";
      state.errors.applyResult = t("toast.createRepairPlanFirst");
      renderAndBind(context, state);
      return;
    }
    state.applyResult = "";
    state.errors.applyResult = "";
    try {
      const result = await context.risk.run({
        command: "apply_env_repair_plan",
        planId: state.plan.planId,
        riskLevel: "high",
        backupReceipt: valueOf(state.plan, "backupName", null),
        title: localize("Apply environment repair plan", "应用环境修复计划"),
        summary: localize("Writes user-level environment variables after showing before/after and backup metadata.", "显示变更前后内容和备份元数据后写入用户级环境变量。"),
        warnings: [valueOf(state.plan, "warnings", localize("Review plan warnings before execution.", "执行前请检查计划警告。"))],
        execute: (confirmationToken) => applyEnvRepairPlan(state.plan!, confirmationToken),
      });
      state.applyResult = resultMessage(result, t("feature.environment.applyPlan"));
      delete state.errors.applyResult;
    } catch (error) {
      state.errors.applyResult = errorMessage(error);
    }
    context.root.innerHTML = renderEnvironmentWorkbench(state);
    bindEnvironmentEvents(context, state);
  });
  bindAction(context.root, "cleanup-path", async () => {
    state.pathCleanupResult = "";
    state.pathCleanupError = "";
    try {
      const result = await context.risk.run({
        command: "cleanup_path_entries",
        planId: "cleanup-path-entries",
        riskLevel: "medium",
        backupReceipt: "env-backup-<PATH-cleanup-time>.json",
        backupRequired: true,
        title: localize("Cleanup PATH entries", "清理 PATH 条目"),
        summary: localize("Removes duplicate, invalid, and stale PATH entries through a token-gated backend command.", "通过确认令牌保护的后端命令移除重复、无效和陈旧的 PATH 条目。"),
        warnings: [localize("Review PATH warnings and backups before running cleanup.", "运行清理前请检查 PATH 警告和备份。")],
        execute: cleanupPathEntries,
      });
      const [reliability, environmentBackups] = await Promise.all([
        inspectEnvironmentReliability(),
        listEnvironmentBackups(),
      ]);
      state.reliability = reliability;
      state.environmentBackups = environmentBackups;
      state.pathCleanupResult = `${resultMessage(result, localize("PATH cleanup completed.", "PATH 清理完成。"))} ${localize("Post-verification refreshed PATH evidence and backups.", "执行后验证已刷新 PATH 证据和备份。")}`;
    } catch (error) {
      state.pathCleanupError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "export-environment-report", () => context.navigate("reports"));
}

export async function refreshEnvironment(context: FeatureContext, state: EnvironmentWorkbenchState): Promise<void> {
  state.checking = true;
  context.toast(t("feature.environment.checking"));
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
  const [reliability, health, preview, envBackups, environmentBackups, pythonAnalysis] = await Promise.allSettled([
    inspectEnvironmentReliability(),
    environmentHealth(),
    previewUserEnvironmentConfiguration(),
    listEnvBackups(),
    listEnvironmentBackups(),
    analyzePythonEnvironment(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  state.checking = false;
  if (reliability.status === "fulfilled") state.reliability = reliability.value;
  else state.errors.reliability = errorMessage(reliability.reason);
  if (health.status === "fulfilled") state.health = health.value;
  else state.errors.health = errorMessage(health.reason);
  if (preview.status === "fulfilled") state.preview = preview.value;
  else state.errors.preview = errorMessage(preview.reason);
  if (envBackups.status === "fulfilled") state.envBackups = envBackups.value;
  else state.errors.envBackups = errorMessage(envBackups.reason);
  if (environmentBackups.status === "fulfilled") state.environmentBackups = environmentBackups.value;
  else state.errors.environmentBackups = errorMessage(environmentBackups.reason);
  if (pythonAnalysis.status === "fulfilled") state.pythonAnalysis = pythonAnalysis.value;
  else state.pythonError = errorMessage(pythonAnalysis.reason);
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
  if (Object.keys(state.errors).length) context.toast(t("feature.environment.checkFailed"), true);
  else context.toast(t("feature.environment.checkDone"));
}

async function createRestorePlan(context: FeatureContext, state: EnvironmentWorkbenchState): Promise<void> {
  state.restorePlan = null;
  state.restoreResult = "";
  state.restoreError = "";
  const [kind, backupName] = state.selectedBackupId.split(":", 2);
  if (!backupName || (kind !== "envCore" && kind !== "legacy")) {
    state.restoreError = localize("Select an environment backup before creating a restore preview.", "创建恢复预览前请选择环境备份。");
    renderAndBind(context, state);
    return;
  }
  try {
    if (kind === "envCore") {
      const record = state.envBackups.find((item) => item.backupName === backupName);
      const diff = await inspectEnvBackup(backupName);
      state.backupDiff = diff;
      state.restorePlan = {
        kind,
        backupName,
        createdAt: record?.createdAt || "unknown",
        reason: record?.reason || "environment backup",
        changedVariables: diff.changedVariables,
        currentJavaHome: diff.currentJavaHome || "",
        backupJavaHome: diff.backupJavaHome || "",
        currentPathEntries: diff.currentPathEntries,
        backupPathEntries: diff.backupPathEntries,
      };
    } else {
      const record = state.environmentBackups.find((item) => item.fileName === backupName);
      if (!record) throw new Error(localize("The selected legacy environment backup is no longer available.", "所选旧版环境备份已不可用。"));
      state.restorePlan = {
        kind,
        backupName,
        createdAt: record.createdAt,
        reason: localize("legacy environment backup", "旧版环境备份"),
        changedVariables: ["DEVENV_HOME", "JAVA_HOME", "Path"],
        currentJavaHome: state.reliability?.userEnv.javaHomeRaw || "",
        backupJavaHome: record.javaHome,
        currentPathEntries: state.reliability?.pathAnalysis.totalEntries || 0,
        backupPathEntries: record.pathEntries,
      };
    }
  } catch (error) {
    state.restoreError = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function executeRestore(context: FeatureContext, state: EnvironmentWorkbenchState): Promise<void> {
  state.restoreResult = "";
  state.restoreError = "";
  state.restoreVerification = "";
  const plan = state.restorePlan;
  if (!plan) {
    state.restoreError = localize("Create and review a restore preview first.", "请先创建并检查恢复预览。");
    renderAndBind(context, state);
    return;
  }
  const command = plan.kind === "envCore" ? "restore_env_backup" : "restore_environment_backup";
  try {
    const result = await context.risk.run({
      command,
      planId: plan.backupName,
      riskLevel: "high",
      backupRequired: true,
      title: localize("Restore user environment backup", "恢复用户环境备份"),
      summary: localize("Restores DEVENV_HOME, JAVA_HOME, and user PATH from the selected backup after creating a new safety backup.", "先创建新的安全备份，再从所选备份恢复 DEVENV_HOME、JAVA_HOME 和用户 PATH。"),
      before: [
        { label: localize("Backup", "备份"), value: plan.backupName },
        { label: localize("Changed variables", "变更变量"), value: plan.changedVariables.join(", ") },
        { label: "JAVA_HOME", value: `${plan.currentJavaHome || localize("not set", "未设置")} -> ${plan.backupJavaHome || localize("not set", "未设置")}` },
        { label: localize("PATH entries", "PATH 条目"), value: `${plan.currentPathEntries} -> ${plan.backupPathEntries}` },
      ],
      warnings: [localize("Open terminals, IDEs, and services may need to restart.", "已打开的终端、IDE 和服务可能需要重启。"), localize("A pre-restore safety backup is created by the backend.", "后端会在恢复前创建安全备份。")],
      execute: (confirmationToken) => plan.kind === "envCore"
        ? restoreEnvBackup(plan.backupName, confirmationToken)
        : restoreEnvironmentBackup(plan.backupName, confirmationToken),
    });
    const reliability = await inspectEnvironmentReliability();
    state.reliability = reliability;
    state.restoreResult = resultMessage(result, localize("Environment backup restored.", "环境备份已恢复。"));
    state.restoreVerification = localize(
      `Post-verification: JAVA_HOME ${reliability.java.javaHomeValid ? "valid" : "needs attention"}; Java consistency ${reliability.java.consistency}; PATH entries ${reliability.pathAnalysis.totalEntries}.`,
      `执行后验证：JAVA_HOME ${reliability.java.javaHomeValid ? "有效" : "需要处理"}；Java 一致性 ${reliability.java.consistency}；PATH 条目 ${reliability.pathAnalysis.totalEntries}。`,
    );
    state.restorePlan = null;
    const [envBackups, environmentBackups] = await Promise.all([listEnvBackups(), listEnvironmentBackups()]);
    state.envBackups = envBackups;
    state.environmentBackups = environmentBackups;
  } catch (error) {
    state.restoreError = errorMessage(error);
  }
  renderAndBind(context, state);
}

function renderAndBind(context: FeatureContext, state: EnvironmentWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
}

function normalizeJdkRoot(path: string): string {
  if (!path) return "";
  const normalized = path.replace(/\//g, "\\");
  const lower = normalized.toLowerCase();
  if (lower.endsWith("\\bin\\java.exe") || lower.endsWith("\\bin\\javac.exe")) return normalized.slice(0, normalized.toLowerCase().lastIndexOf("\\bin\\"));
  if (lower.endsWith("\\java.exe") || lower.endsWith("\\javac.exe")) return normalized.slice(0, normalized.lastIndexOf("\\"));
  return normalized;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function environmentPlanFailure(message: string, jdkPath: string): EnvironmentWorkbenchState["createPlanFailure"] {
  const tool = message.match(/\b(java|javac|jar)\.exe\b/i)?.[0] ?? "JDK toolchain";
  const exitCode = message.match(/exit(?: code)?\s*(?:Some\()?(-?\d+)/i)?.[1] ?? t("state.notAvailable");
  const args = tool.toLowerCase() === "jar.exe" ? "" : " -version";
  return {
    step: localize("JDK compatibility probe", "JDK 兼容性探测"),
    command: tool === "JDK toolchain" ? localize(`Validate ${jdkPath}`, `验证 ${jdkPath}`) : `${jdkPath}\\bin\\${tool}${args}`,
    exitCode,
    readableError: message,
    nextStep: localize("Confirm this is a JDK root containing runnable java.exe, javac.exe, and jar.exe. JDK 8 jar usage output is accepted without --help.", "请确认这是包含可运行 java.exe、javac.exe 和 jar.exe 的 JDK 根目录。JDK 8 的 jar 用法输出无需 --help 也会被接受。"),
  };
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}
