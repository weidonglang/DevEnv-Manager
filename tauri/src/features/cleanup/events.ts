import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { cleanDevCache, clearDownloadCache, createCleanupPlan, createMovePlan, executeMovePlan, listRollbackRecords, rollbackMove, scanCleanupTargets, storageCleanupArchitecture, inspectMaintenanceOverview } from "./api";
import { renderCleanupWorkbench } from "./render";
import type { CleanupWorkbenchState } from "./state";

export function bindCleanupEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  bindAction(context.root, "scan-cleanup", () => refreshCleanup(context, state));
  bindAction(context.root, "create-cleanup-plan", async () => {
    state.selectedIds = collectSelectedIds(state);
    state.plan = await createCleanupPlan(state.selectedIds);
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindAction(context.root, "clear-download-cache", () =>
    context.risk.run({
      command: "clear_download_cache",
      planId: "clear_download_cache:managed",
      riskLevel: "high",
      title: "Clear download cache",
      summary: "Clears managed download cache through a token-gated backend command.",
      warnings: ["Only managed cache entries should be removed."],
      execute: clearDownloadCache,
    }),
  );
  bindAction(context.root, "clean-dev-cache", () =>
    context.risk.run({
      command: "clean_dev_cache",
      planId: "clean_dev_cache:npm",
      riskLevel: "high",
      title: "Clean dev cache",
      summary: "Cleans selected development cache through a token-gated backend command.",
      warnings: ["Review tool-specific cache scope before executing."],
      execute: (confirmationToken) => cleanDevCache("npm", confirmationToken),
    }),
  );
  bindAction(context.root, "create-move-plan", async () => {
    state.movePlan = await createMovePlan("", "D", "archive");
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindAction(context.root, "execute-move-plan", () => {
    if (!state.movePlan) return context.toast("Create a move plan first.", true);
    return context.risk.run({
      command: "execute_move_plan",
      planId: state.movePlan.planId,
      riskLevel: "high",
      title: "Execute move plan",
      summary: "Moves or archives selected files using a backend plan and token gate.",
      warnings: ["Review source, target drive, and rollback options."],
      execute: (confirmationToken) => executeMovePlan(state.movePlan!, confirmationToken),
    });
  });
  bindAction(context.root, "rollback-move", () =>
    context.risk.run({
      command: "rollback_move",
      planId: valueOf(state.rollbackRecords[0], "id", "rollback_move"),
      riskLevel: "high",
      title: "Rollback move",
      summary: "Rolls back a previous move operation with a backend token.",
      warnings: ["Review rollback record before execution."],
      execute: (confirmationToken) => rollbackMove(valueOf(state.rollbackRecords[0], "id", ""), confirmationToken),
    }),
  );
  bindAction(context.root, "create-expansion-plan", () => context.toast("Expansion plan preview is available in the next detailed cleanup pass."));
}

export async function refreshCleanup(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  const [architecture, overview, scan, rollbackRecords] = await Promise.all([
    storageCleanupArchitecture(),
    inspectMaintenanceOverview(),
    scanCleanupTargets(),
    listRollbackRecords(),
  ]);
  state.architecture = architecture;
  state.overview = overview;
  state.scan = scan;
  state.rollbackRecords = rollbackRecords;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function collectSelectedIds(state: CleanupWorkbenchState): string[] {
  return state.scan?.categories.flatMap((category) => category.items.filter((item) => item.selectedByDefault).map((item) => item.id)) ?? [];
}
