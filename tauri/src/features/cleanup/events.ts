import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { bindAction, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import type { CleanupArchitecture, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionResult, FolderUsageReport, LargeFileItem, MaintenanceOverview, MoveResult, PartitionLayoutReport, RollbackRecord } from "../../types";
import { cleanDevCache, cleanSelectedTargets, clearDownloadCache, createCDriveExpansionPlan, createCleanupPlan, createDesktopArchivePlan, createDownloadsArchivePlan, createMovePlan, executeCDriveExpansion, executeDesktopArchivePlan, executeDownloadsArchivePlan, executeMovePlan, inspectDesktop, inspectDiskOverview, inspectDownloads, inspectMaintenanceOverview, inspectPartitionLayout, listRollbackRecords, openAnalysisPath, rollbackMove, scanCleanupTargets, scanDuplicateLargeFiles, scanLargeFiles, storageCleanupArchitecture } from "./api";
import { renderCleanupWorkbench } from "./render";
import type { CleanupWorkbenchState } from "./state";

export function bindCleanupEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  bindCleanupCandidateSelection(context, state);
  bindAction(context.root, "scan-cleanup", () => refreshCleanup(context, state));
  bindAction(context.root, "create-cleanup-plan", async () => {
    const selectedIds = selectedCleanableIds(state);
    if (!selectedIds.length) {
      context.toast(t("toast.selectCleanupCandidateFirst"), true);
      return;
    }
    state.selectedIds = selectedIds;
    state.plan = null;
    state.cleanupResult = null;
    context.progress.start(t("feature.cleanup.createPlan"));
    try {
      state.plan = await createCleanupPlan(selectedIds);
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
    state.cleanupResult = null;
    state.errors.executeCleanupResult = "";
    const result = await context.risk.run({
      command: "execute_cleanup_plan",
      planId: state.plan.planId,
      riskLevel: "medium",
      title: t("feature.cleanup.executePlanTitle"),
      summary: t("feature.cleanup.executePlanSummary"),
      before: [
        { label: t("feature.cleanup.selected"), value: String(state.plan.selectedItems.length) },
        { label: t("feature.cleanup.bytes"), value: String(state.plan.estimatedBytes) },
        { label: t("feature.cleanup.planExecutable"), value: String(state.plan.selectedItems.length) },
      ],
      after: [
        { label: t("feature.cleanup.resultCleaned"), value: t("feature.cleanup.resultAvailableAfterExecute") },
        { label: t("feature.cleanup.resultRecovery"), value: t("feature.cleanup.resultRecoveryDetail") },
      ],
      warnings: [t("feature.cleanup.executePlanWarning"), t("feature.cleanup.executePlanRecoveryWarning"), ...state.plan.warnings],
      execute: (confirmationToken) => cleanSelectedTargets(state.plan!, confirmationToken),
    });
    state.cleanupResult = result as CleanupWorkbenchState["cleanupResult"];
    delete state.errors.executeCleanupResult;
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
      state.moveOperationResult = t("feature.cleanup.chooseMoveSourceCancelled");
      context.toast(t("feature.cleanup.chooseMoveSourceCancelled"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      return;
    }
    state.moveSource = selected;
    state.moveOperationResult = `${t("feature.cleanup.moveSource")}: ${selected}`;
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
  bindAction(context.root, "inspect-disk-overview", () => refreshDiskOverview(context, state));
  bindAction(context.root, "scan-large-files-c", () => scanCLargeFiles(context, state));
  bindAction(context.root, "scan-duplicate-large-files", () => scanDuplicateFiles(context, state));
  bindAction(context.root, "create-desktop-archive-plan", () => createArchivePlan(context, state, "desktop"));
  bindAction(context.root, "execute-desktop-archive-plan", () => executeArchivePlan(context, state, "desktop"));
  bindAction(context.root, "create-downloads-archive-plan", () => createArchivePlan(context, state, "downloads"));
  bindAction(context.root, "execute-downloads-archive-plan", () => executeArchivePlan(context, state, "downloads"));
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
    state.expansionResult = null;
    state.errors.expansionResult = "";
    try {
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
      delete state.errors.expansionResult;
    } catch (error) {
      state.errors.expansionResult = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindCleanupUtilityActions(context, state);
  bindCleanupPagination(context, state);
}

function syncMoveInputs(context: FeatureContext, state: CleanupWorkbenchState): void {
  state.moveSource = context.root.querySelector<HTMLInputElement>("#cleanup-move-source")?.value.trim() || state.moveSource;
  state.moveTargetDrive = context.root.querySelector<HTMLInputElement>("#cleanup-move-target-drive")?.value.trim() || state.moveTargetDrive;
  state.moveMode = context.root.querySelector<HTMLSelectElement>("#cleanup-move-mode")?.value.trim() || state.moveMode;
}

export async function refreshCleanup(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  const [architecture, overview, diskOverview, scan, rollbackRecords] = await Promise.allSettled([
    storageCleanupArchitecture(),
    inspectMaintenanceOverview(),
    inspectDiskOverview(),
    scanCleanupTargets(),
    listRollbackRecords(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  applySettled(state, "architecture", architecture);
  applySettled(state, "overview", overview);
  applySettled(state, "diskOverview", diskOverview);
  applySettled(state, "scan", scan);
  applySettled(state, "rollbackRecords", rollbackRecords);
  state.selectedIds = defaultSelectedIds(state);
  state.plan = null;
  state.cleanupResult = null;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function defaultSelectedIds(state: CleanupWorkbenchState): string[] {
  return state.scan?.categories.flatMap((category) => category.items.filter((item) => item.cleanable && item.selectedByDefault).map((item) => item.id)) ?? [];
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

async function refreshDiskOverview(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start("Refreshing disk overview");
  try {
    state.diskOverview = await inspectDiskOverview();
    delete state.errors.diskOverview;
    context.progress.done("Disk overview refreshed");
  } catch (error) {
    state.errors.diskOverview = errorMessage(error);
    context.progress.fail(state.errors.diskOverview);
  }
  if (!context.isCurrent()) return;
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

async function scanDuplicateFiles(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start("Scanning duplicate large files");
  try {
    state.duplicateGroups = await scanDuplicateLargeFiles("C:\\", 100);
    state.duplicateGroupsPage = 1;
    delete state.errors.duplicateFiles;
    context.progress.done("Duplicate scan complete");
  } catch (error) {
    state.errors.duplicateFiles = errorMessage(error);
    context.progress.fail(state.errors.duplicateFiles);
  }
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

async function createArchivePlan(context: FeatureContext, state: CleanupWorkbenchState, kind: "desktop" | "downloads"): Promise<void> {
  syncMoveInputs(context, state);
  const targetDrive = state.moveTargetDrive || "D";
  const errorKey = kind === "desktop" ? "desktopArchive" : "downloadsArchive";
  context.progress.start(kind === "desktop" ? "Creating desktop archive plan" : "Creating downloads archive plan");
  try {
    if (kind === "desktop") {
      state.desktopArchivePlan = await createDesktopArchivePlan(targetDrive);
      state.desktopArchiveResult = null;
      state.desktop = await inspectDesktop();
    } else {
      state.downloadsArchivePlan = await createDownloadsArchivePlan(targetDrive);
      state.downloadsArchiveResult = null;
      state.downloads = await inspectDownloads();
    }
    delete state.errors[errorKey];
    if (!context.isCurrent()) return;
    context.progress.done(t("toast.planReady"));
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  } catch (error) {
    state.errors[errorKey] = errorMessage(error);
    context.progress.fail(state.errors[errorKey]);
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  }
}

async function executeArchivePlan(context: FeatureContext, state: CleanupWorkbenchState, kind: "desktop" | "downloads"): Promise<void> {
  const plan = kind === "desktop" ? state.desktopArchivePlan : state.downloadsArchivePlan;
  const errorKey = kind === "desktop" ? "desktopArchive" : "downloadsArchive";
  if (!plan) {
    state.errors[errorKey] = kind === "desktop" ? "Create a desktop archive plan first." : "Create a downloads archive plan first.";
    context.toast(state.errors[errorKey], true);
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
    return;
  }
  if (kind === "desktop") state.desktopArchiveResult = null;
  else state.downloadsArchiveResult = null;
  state.errors[`${errorKey}Result`] = "";
  try {
    const result = await context.risk.run({
      command: "execute_move_plan",
      actionId: kind === "desktop" ? "execute_desktop_archive_plan" : "execute_downloads_archive_plan",
      planId: plan.planId,
      riskLevel: "high",
      backupReceipt: plan.reversible ? plan.target : null,
      title: kind === "desktop" ? "Execute desktop archive plan" : "Execute downloads archive plan",
      summary: kind === "desktop" ? "Archives selected desktop files after preview and token confirmation." : "Archives selected Downloads files after preview and token confirmation.",
      before: [
        { label: "Source", value: plan.source },
        { label: "Target", value: plan.target },
        { label: t("feature.cleanup.bytes"), value: String(plan.estimatedBytes) },
      ],
      after: [
        { label: t("feature.cleanup.resultCleaned"), value: "Moved items and failures are rendered in the Cleanup page result panel." },
        { label: t("feature.cleanup.resultRecovery"), value: "Use target folder, rollback record, or report summary to restore files." },
      ],
      warnings: plan.warnings,
      execute: (confirmationToken) => kind === "desktop" ? executeDesktopArchivePlan(plan, confirmationToken) : executeDownloadsArchivePlan(plan, confirmationToken),
    });
    if (kind === "desktop") state.desktopArchiveResult = result as MoveResult;
    else state.downloadsArchiveResult = result as MoveResult;
    delete state.errors[errorKey];
    delete state.errors[`${errorKey}Result`];
  } catch (error) {
    state.errors[errorKey] = errorMessage(error);
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
      if (action === "cleanup-duplicate-large-files:prev") state.duplicateGroupsPage = Math.max(1, state.duplicateGroupsPage - 1);
      if (action === "cleanup-duplicate-large-files:next") state.duplicateGroupsPage += 1;
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
      const candidate = findCandidate(state, id);
      if (!candidate?.cleanable) {
        checkbox.checked = false;
        context.toast(candidate?.skippedReason || t("feature.cleanup.notAllowed"), true);
        return;
      }
      const selected = new Set(state.selectedIds);
      if (checkbox.checked) selected.add(id);
      else selected.delete(id);
      state.selectedIds = Array.from(selected).filter((candidateId) => findCandidate(state, candidateId)?.cleanable);
      state.plan = null;
      state.cleanupResult = null;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    });
  });
}

function selectedCleanableIds(state: CleanupWorkbenchState): string[] {
  return state.selectedIds.filter((id) => findCandidate(state, id)?.cleanable);
}

function findCandidate(state: CleanupWorkbenchState, id: string) {
  return state.scan?.categories.flatMap((category) => category.items).find((item) => item.id === id);
}

function bindCleanupUtilityActions(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-large-file-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await openAnalysisPath(button.dataset.largeFileOpen || "");
        state.moveOperationResult = result.message;
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(result.message);
      } catch (error) {
        state.moveOperationResult = errorMessage(error);
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(errorMessage(error), true);
      }
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-large-file-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.largeFileCopy || "");
      state.moveOperationResult = `${t("feature.runtimes.copyPath")}: ${button.dataset.largeFileCopy || ""}`;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      context.toast(t("toast.runtimePathCopied"));
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-duplicate-file-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await openAnalysisPath(button.dataset.duplicateFileOpen || "");
        state.moveOperationResult = result.message;
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(result.message);
      } catch (error) {
        state.moveOperationResult = errorMessage(error);
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(errorMessage(error), true);
      }
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-duplicate-file-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.duplicateFileCopy || "");
      state.moveOperationResult = `${t("feature.runtimes.copyPath")}: ${button.dataset.duplicateFileCopy || ""}`;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      context.toast(t("toast.runtimePathCopied"));
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-disk-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      const drive = button.dataset.diskOpen || "";
      const path = drive.endsWith("\\") ? drive : `${drive}\\`;
      try {
        const result = await openAnalysisPath(path);
        state.moveOperationResult = result.message;
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(result.message);
      } catch (error) {
        state.moveOperationResult = errorMessage(error);
        context.root.innerHTML = renderCleanupWorkbench(state);
        bindCleanupEvents(context, state);
        context.toast(errorMessage(error), true);
      }
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-disk-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.diskCopy || "");
      state.moveOperationResult = button.dataset.diskCopy || "";
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      context.toast(t("toast.runtimePathCopied"));
    });
  });
}

function applySettled(state: CleanupWorkbenchState, key: "architecture", result: PromiseSettledResult<CleanupArchitecture>): void;
function applySettled(state: CleanupWorkbenchState, key: "overview", result: PromiseSettledResult<MaintenanceOverview>): void;
function applySettled(state: CleanupWorkbenchState, key: "diskOverview", result: PromiseSettledResult<DiskVolumeInfo[]>): void;
function applySettled(state: CleanupWorkbenchState, key: "scan", result: PromiseSettledResult<CleanupScanReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "rollbackRecords", result: PromiseSettledResult<RollbackRecord[]>): void;
function applySettled(state: CleanupWorkbenchState, key: "partition", result: PromiseSettledResult<PartitionLayoutReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "desktop", result: PromiseSettledResult<FolderUsageReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "downloads", result: PromiseSettledResult<FolderUsageReport>): void;
function applySettled(state: CleanupWorkbenchState, key: "duplicateGroups", result: PromiseSettledResult<DuplicateGroup[]>): void;
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
