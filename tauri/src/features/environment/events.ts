import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { applyEnvRepairPlan, cleanupPathEntries, createJavaStabilizePlan, environmentHealth, inspectEnvironmentReliability, listEnvBackups, listEnvironmentBackups, previewUserEnvironmentConfiguration } from "./api";
import { renderEnvironmentWorkbench } from "./render";
import type { EnvironmentWorkbenchState } from "./state";

export function bindEnvironmentEvents(context: FeatureContext, state: EnvironmentWorkbenchState): void {
  bindAction(context.root, "inspect-environment", () => refreshEnvironment(context, state));
  bindAction(context.root, "create-java-plan", async () => {
    state.plan = await createJavaStabilizePlan(null);
    context.root.innerHTML = renderEnvironmentWorkbench(state);
    bindEnvironmentEvents(context, state);
  });
  bindAction(context.root, "apply-java-plan", async () => {
    if (!state.plan) {
      context.toast("Create a repair plan first.", true);
      return;
    }
    await context.risk.run({
      command: "apply_env_repair_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      backupReceipt: valueOf(state.plan, "backupName", null),
      title: "Apply environment repair plan",
      summary: "Writes user-level environment variables after showing before/after and backup metadata.",
      warnings: [valueOf(state.plan, "warnings", "Review plan warnings before execution.")],
      execute: (confirmationToken) => applyEnvRepairPlan(state.plan!, confirmationToken),
    });
  });
  bindAction(context.root, "cleanup-path", () =>
    context.risk.run({
      command: "cleanup_path_entries",
      planId: "cleanup_path_entries:current-user",
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
  const [reliability, health, preview, envBackups, environmentBackups] = await Promise.all([
    inspectEnvironmentReliability(),
    environmentHealth(),
    previewUserEnvironmentConfiguration(),
    listEnvBackups(),
    listEnvironmentBackups(),
  ]);
  state.reliability = reliability;
  state.health = health;
  state.preview = preview;
  state.envBackups = envBackups;
  state.environmentBackups = environmentBackups;
  context.root.innerHTML = renderEnvironmentWorkbench(state);
  bindEnvironmentEvents(context, state);
}
