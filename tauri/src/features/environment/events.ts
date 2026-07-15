import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { t } from "../../core/i18n";
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
      state.configurationError = "Refresh the environment preview before applying configuration.";
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
        title: "Apply user environment configuration",
        summary: "Writes the previewed DEVENV_HOME, JAVA_HOME, and user PATH values after baseline verification.",
        before: preview.changes.map((change) => ({ label: change.name, value: `${change.current || "not set"} -> ${change.proposed || "not set"}` })),
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
      state.configurationResult = `${resultMessage(result, "User environment configuration applied.")} Post-verification refreshed JAVA_HOME, PATH, and backup evidence.`;
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
      state.aliasResult = result.message || "Windows execution alias settings opened.";
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
      state.pythonError = "Create and review a Python repair preview first.";
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
        title: "Apply Python health repair",
        summary: "Runs the previewed pip repair and/or prepends Python paths after verifying the environment baseline.",
        before: [
          { label: "Python", value: plan.pythonPath },
          { label: "Actions", value: plan.actions.join("; ") },
          { label: "PATH additions", value: plan.pathAdded.join("; ") || "none" },
        ],
        warnings: plan.warnings,
        execute: (confirmationToken) => applyPythonRepair(plan.planId, confirmationToken),
      });
      const [analysis, reliability] = await Promise.all([analyzePythonEnvironment(), inspectEnvironmentReliability()]);
      state.pythonAnalysis = analysis;
      state.reliability = reliability;
      state.pythonResult = `${resultMessage(result, "Python repair completed.")} Post-verification refreshed Python ownership, aliases, and PATH evidence.`;
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
      context.toast(t("toast.createRepairPlanFirst"), true);
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
        title: "Apply environment repair plan",
        summary: "Writes user-level environment variables after showing before/after and backup metadata.",
        warnings: [valueOf(state.plan, "warnings", "Review plan warnings before execution.")],
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
        riskLevel: "high",
        backupRequired: true,
        title: "Cleanup PATH entries",
        summary: "Removes duplicate, invalid, and stale PATH entries through a token-gated backend command.",
        warnings: ["Review PATH warnings and backups before running cleanup."],
        execute: cleanupPathEntries,
      });
      const [reliability, environmentBackups] = await Promise.all([
        inspectEnvironmentReliability(),
        listEnvironmentBackups(),
      ]);
      state.reliability = reliability;
      state.environmentBackups = environmentBackups;
      state.pathCleanupResult = `${resultMessage(result, "PATH cleanup completed.")} Post-verification refreshed PATH evidence and backups.`;
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
    state.restoreError = "Select an environment backup before creating a restore preview.";
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
      if (!record) throw new Error("The selected legacy environment backup is no longer available.");
      state.restorePlan = {
        kind,
        backupName,
        createdAt: record.createdAt,
        reason: "legacy environment backup",
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
    state.restoreError = "Create and review a restore preview first.";
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
      title: "Restore user environment backup",
      summary: "Restores DEVENV_HOME, JAVA_HOME, and user PATH from the selected backup after creating a new safety backup.",
      before: [
        { label: "Backup", value: plan.backupName },
        { label: "Changed variables", value: plan.changedVariables.join(", ") },
        { label: "JAVA_HOME", value: `${plan.currentJavaHome || "not set"} -> ${plan.backupJavaHome || "not set"}` },
        { label: "PATH entries", value: `${plan.currentPathEntries} -> ${plan.backupPathEntries}` },
      ],
      warnings: ["Open terminals, IDEs, and services may need to restart.", "A pre-restore safety backup is created by the backend."],
      execute: (confirmationToken) => plan.kind === "envCore"
        ? restoreEnvBackup(plan.backupName, confirmationToken)
        : restoreEnvironmentBackup(plan.backupName, confirmationToken),
    });
    const reliability = await inspectEnvironmentReliability();
    state.reliability = reliability;
    state.restoreResult = resultMessage(result, "Environment backup restored.");
    state.restoreVerification = `Post-verification: JAVA_HOME ${reliability.java.javaHomeValid ? "valid" : "needs attention"}; Java consistency ${reliability.java.consistency}; PATH entries ${reliability.pathAnalysis.totalEntries}.`;
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
    step: "JDK compatibility probe",
    command: tool === "JDK toolchain" ? `Validate ${jdkPath}` : `${jdkPath}\\bin\\${tool}${args}`,
    exitCode,
    readableError: message,
    nextStep: "Confirm this is a JDK root containing runnable java.exe, javac.exe, and jar.exe. JDK 8 jar usage output is accepted without --help.",
  };
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}
