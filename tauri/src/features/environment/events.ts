import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { t } from "../../core/i18n";
import { bindAction, valueOf } from "../sharedView";
import { applyEnvRepairPlan, cleanupPathEntries, createJavaStabilizePlan, environmentHealth, inspectEnvironmentReliability, listEnvBackups, listEnvironmentBackups, previewUserEnvironmentConfiguration } from "./api";
import { renderEnvironmentWorkbench } from "./render";
import type { EnvironmentWorkbenchState } from "./state";

export function bindEnvironmentEvents(context: FeatureContext, state: EnvironmentWorkbenchState): void {
  bindAction(context.root, "inspect-environment", () => refreshEnvironment(context, state));
  context.root.querySelector<HTMLSelectElement>("#java-plan-jdk-path")?.addEventListener("change", (event) => {
    state.selectedJdkRoot = normalizeJdkRoot((event.currentTarget as HTMLSelectElement).value.trim());
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
    context.toast(t("feature.environment.jdkRootSelected"));
    context.root.innerHTML = renderEnvironmentWorkbench(state);
    bindEnvironmentEvents(context, state);
  });
  bindAction(context.root, "create-java-plan", async () => {
    const jdkPath = normalizeJdkRoot(state.selectedJdkRoot || context.root.querySelector<HTMLSelectElement>("#java-plan-jdk-path")?.value.trim() || "");
    if (!jdkPath) {
      context.toast(t("feature.environment.selectJdkRootFirst"), true);
      return;
    }
    context.progress.start(t("feature.environment.creatingJavaPlan"));
    try {
      state.plan = await createJavaStabilizePlan(jdkPath);
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderEnvironmentWorkbench(state);
      bindEnvironmentEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
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
  bindAction(context.root, "cleanup-path", () =>
    context.risk.run({
      command: "cleanup_path_entries",
      planId: "cleanup-path-entries",
      riskLevel: "high",
      title: "Cleanup PATH entries",
      summary: "Removes duplicate, invalid, and stale PATH entries through a token-gated backend command.",
      warnings: ["Review PATH warnings and backups before running cleanup."],
      execute: cleanupPathEntries,
    }),
  );
  bindAction(context.root, "export-environment-report", () => context.navigate("reports"));
}

export async function refreshEnvironment(context: FeatureContext, state: EnvironmentWorkbenchState): Promise<void> {
  state.checking = true;
  context.toast(t("feature.environment.checking"));
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
  const [reliability, health, preview, envBackups, environmentBackups] = await Promise.allSettled([
    inspectEnvironmentReliability(),
    environmentHealth(),
    previewUserEnvironmentConfiguration(),
    listEnvBackups(),
    listEnvironmentBackups(),
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
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
  if (Object.keys(state.errors).length) context.toast(t("feature.environment.checkFailed"), true);
  else context.toast(t("feature.environment.checkDone"));
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

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}
