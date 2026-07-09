import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { bindAction, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import type { CleanupArchitecture, CleanupScanReport, ExpansionResult, FolderUsageReport, LargeFileItem, MaintenanceOverview, PartitionLayoutReport, RollbackRecord } from "../../types";
import { cleanDevCache, cleanSelectedTargets, clearDownloadCache, createCDriveExpansionPlan, createCleanupPlan, createMovePlan, executeCDriveExpansion, executeMovePlan, inspectDesktop, inspectDownloads, inspectMaintenanceOverview, inspectPartitionLayout, listRollbackRecords, openAnalysisPath, rollbackMove, scanCleanupTargets, scanLargeFiles, storageCleanupArchitecture } from "./api";
import { renderCleanupWorkbench } from "./render";
import type { CleanupWorkbenchState } from "./state";

export function bindCleanupEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  bindCleanupCandidateSelection(context, state);
  bindAction(context.root, "scan-cleanup", () => refreshCleanup(context, state));
  bindAction(context.root, "create-cleanup-plan", async () => {
    if (!state.selectedIds.length) {
      context.toast(t("toast.selectCleanupCandidateFirst"), true);
      return;
    }
    context.progress.start(t("feature.cleanup.createPlan"));
    try {
      state.plan = await createCleanupPlan(state.selectedIds);
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-cleanup-plan", async () => {
    if (!state.plan) return context.toast(t("toast.createCleanupPlanFirst"), true);
    const result = await context.risk.run({
      command: "execute_cleanup_plan",
      planId: state.plan.planId,
      riskLevel: "medium",
      title: t("feature.cleanup.executePlanTitle"),
      summary: t("feature.cleanup.executePlanSummary"),
      before: [
        { label: t("feature.cleanup.selected"), value: String(state.plan.selectedItems.length) },
        { label: t("feature.cleanup.bytes"), value: String(state.plan.estimatedBytes) },
      ],
      warnings: [t("feature.cleanup.executePlanWarning"), ...state.plan.warnings],
      execute: (confirmationToken) => cleanSelectedTargets(state.plan!, confirmationToken),
    });
    state.cleanupResult = result as CleanupWorkbenchState["cleanupResult"];
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindAction(context.root, "clear-download-cache", () =>
    context.risk.run({
      command: "clear_download_cache",
      planId: "clear-download-cache",
      riskLevel: "medium",
      title: "Clear download cache",
      summary: "Clears managed download cache through a token-gated backend command.",
      warnings: ["Only managed cache entries should be removed."],
      execute: clearDownloadCache,
    }),
  );
  bindAction(context.root, "clean-dev-cache", () =>
    context.risk.run({
      command: "clean_dev_cache",
      planId: "tool-npm",
      riskLevel: "medium",
      title: "Clean dev cache",
      summary: "Cleans selected development cache through a token-gated backend command.",
      warnings: ["Review tool-specific cache scope before executing."],
      execute: (confirmationToken) => cleanDevCache("npm", confirmationToken),
    }),
  );
  bindAction(context.root, "choose-cleanup-move-source", async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) {
      context.toast(t("feature.cleanup.chooseMoveSourceCancelled"));
      return;
    }
    state.moveSource = selected;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindAction(context.root, "create-move-plan", async () => {
    syncMoveInputs(context, state);
    if (!state.moveSource) {
      context.toast(t("feature.cleanup.moveSourceRequired"), true);
      return;
    }
    context.progress.start(t("feature.cleanup.createMove"));
    try {
      state.movePlan = await createMovePlan(state.moveSource, state.moveTargetDrive, state.moveMode);
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-move-plan", () => {
    if (!state.movePlan) return context.toast(t("toast.createMovePlanFirst"), true);
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
      planId: valueOf(state.rollbackRecords[0], "rollbackId", "rollback_move"),
      riskLevel: "high",
      title: "Rollback move",
      summary: "Rolls back a previous move operation with a backend token.",
      warnings: ["Review rollback record before execution."],
      execute: (confirmationToken) => rollbackMove(valueOf(state.rollbackRecords[0], "rollbackId", ""), confirmationToken),
    }),
  );
  bindAction(context.root, "inspect-c-drive-rescue", () => refreshCDriveRescue(context, state));
  bindAction(context.root, "scan-large-files-c", () => scanCLargeFiles(context, state));
  bindAction(context.root, "create-expansion-plan", async () => {
    context.progress.start(t("feature.cleanup.expansion"));
    try {
      state.expansionPlan = await createCDriveExpansionPlan();
      state.expansionResult = null;
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-expansion-plan", async () => {
    if (!state.expansionPlan) return context.toast(t("feature.cleanup.createExpansionFirst"), true);
    const result = await context.risk.run({
      command: "execute_expansion_plan",
      planId: state.expansionPlan.planId,
      riskLevel: "critical",
      title: t("feature.cleanup.executeExpansionTitle"),
      summary: t("feature.cleanup.executeExpansionSummary"),
      before: [
        { label: t("feature.cleanup.expansionMode"), value: state.expansionPlan.mode },
        { label: t("feature.cleanup.estimatedAdded"), value: String(state.expansionPlan.estimatedAddedBytes) },
      ],
      warnings: [t("feature.cleanup.executeExpansionWarning")],
      execute: (confirmationToken) => executeCDriveExpansion(state.expansionPlan!, confirmationToken),
    });
    state.expansionResult = result as ExpansionResult;
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindLargeFileActions(context);
  bindCleanupPagination(context, state);
}

function syncMoveInputs(context: FeatureContext, state: CleanupWorkbenchState): void {
  state.moveSource = context.root.querySelector<HTMLInputElement>("#cleanup-move-source")?.value.trim() || state.moveSource;
  state.moveTargetDrive = context.root.querySelector<HTMLInputElement>("#cleanup-move-target-drive")?.value.trim() || state.moveTargetDrive;
  state.moveMode = context.root.querySelector<HTMLSelectElement>("#cleanup-move-mode")?.value.trim() || state.moveMode;
}

export async function refreshCleanup(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  const [architecture, overview, scan, rollbackRecords] = await Promise.allSettled([
    storageCleanupArchitecture(),
    inspectMaintenanceOverview(),
    scanCleanupTargets(),
    listRollbackRecords(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  applySettled(state, "architecture", architecture);
  applySettled(state, "overview", overview);
  applySettled(state, "scan", scan);
  applySettled(state, "rollbackRecords", rollbackRecords);
  state.selectedIds = defaultSelectedIds(state);
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function defaultSelectedIds(state: CleanupWorkbenchState): string[] {
  return state.scan?.categories.flatMap((category) => category.items.filter((item) => item.selectedByDefault).map((item) => item.id)) ?? [];
}

async function refreshCDriveRescue(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  const [overview, partition, desktop, downloads] = await Promise.allSettled([
    inspectMaintenanceOverview(),
    inspectPartitionLayout(),
    inspectDesktop(),
    inspectDownloads(),
  ]);
  if (!context.isCurrent()) return;
  delete state.errors.cRescue;
  applySettled(state, "overview", overview);
  applySettled(state, "partition", partition);
  applySettled(state, "desktop", desktop);
  applySettled(state, "downloads", downloads);
  state.errors.cRescue = [overview, partition, desktop, downloads]
    .filter((item) => item.status === "rejected")
    .map((item) => errorMessage((item as PromiseRejectedResult).reason))
    .join("; ");
  if (!state.errors.cRescue) delete state.errors.cRescue;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

async function scanCLargeFiles(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start(t("feature.cleanup.scanLargeFiles"));
  try {
    state.largeFiles = await scanLargeFiles("C:\\", 500);
    state.largeFilesPage = 1;
    delete state.errors.largeFiles;
    context.progress.done(t("feature.cleanup.scanLargeFilesDone"));
  } catch (error) {
    state.errors.largeFiles = errorMessage(error);
    context.progress.fail(state.errors.largeFiles);
  }
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function bindCleanupPagination(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.pageAction;
      if (action === "cleanup-large-files:prev") state.largeFilesPage = Math.max(1, state.largeFilesPage - 1);
      if (action === "cleanup-large-files:next") state.largeFilesPage += 1;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    });
  });
}

function bindCleanupCandidateSelection(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLInputElement>("[data-cleanup-candidate]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.cleanupCandidate || "";
      if (!id) return;
      const selected = new Set(state.selectedIds);
      if (checkbox.checked) selected.add(id);
      else selected.delete(id);
      state.selectedIds = Array.from(selected);
      state.plan = null;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    });
  });
}

function bindLargeFileActions(context: FeatureContext): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-large-file-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await openAnalysisPath(button.dataset.largeFileOpen || "");
        context.toast(result.message);
      } catch (error) {
        context.toast(errorMessage(error), true);
      }
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-large-file-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.largeFileCopy || "");
      context.toast(t("toast.runtimePathCopied"));
    });
  });
}

function applySettled(state: CleanupWorkbenchState, key: "architecture", result: PromiseSettledResult<CleanupArchitecture>): void;
function applySettled(state: CleanupWorkbenchState, key: "overview", result: PromiseSettledResult<MaintenanceOverview>): void;
function applySettled(state: CleanupWorkbenchState, key: "scan", result: PromiseSettledResult<CleanupScanReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "rollbackRecords", result: PromiseSettledResult<RollbackRecord[]>): void;
function applySettled(state: CleanupWorkbenchState, key: "partition", result: PromiseSettledResult<PartitionLayoutReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "desktop", result: PromiseSettledResult<FolderUsageReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "downloads", result: PromiseSettledResult<FolderUsageReport>): void;
function applySettled(state: CleanupWorkbenchState, key: keyof CleanupWorkbenchState, result: PromiseSettledResult<unknown>): void {
  if (result.status === "fulfilled") {
    (state as unknown as Record<string, unknown>)[key] = result.value;
  } else {
    state.errors[String(key)] = errorMessage(result.reason);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
