import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { bindAction, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import type { ArchivePlanItem, CleanupArchitecture, CleanupResult, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionResult, FolderUsageReport, GenericArchiveResult, LargeFileItem, MaintenanceOverview, MoveResult, OperationResult, PartitionLayoutReport, RollbackRecord } from "../../types";
import { addArchivePlanItem, cleanDevCache, cleanSelectedTargets, clearDownloadCache, createCDriveExpansionPlan, createCleanupPlan, createDesktopArchivePlan, createDownloadsArchivePlan, createGenericArchivePlan, createMovePlan, executeCDriveExpansion, executeDesktopArchivePlan, executeDownloadsArchivePlan, executeGenericArchivePlan, executeMovePlan, inspectAppUsage, inspectDesktop, inspectDiskOverview, inspectDownloads, inspectInstalledSoftwareUsage, inspectMaintenanceOverview, inspectPartitionLayout, listArchivePlanItems, listRollbackRecords, openAnalysisPath, removeArchivePlanItem, rollbackMove, scanCleanupTargets, scanDuplicateLargeFiles, scanLargeFiles, storageCleanupArchitecture } from "./api";
import { renderCleanupWorkbench } from "./render";
import type { CleanupWorkbenchState } from "./state";

export function bindCleanupEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  bindCleanupCandidateSelection(context, state);
  bindAction(context.root, "inspect-application-usage", async () => {
    delete state.errors.appUsage;
    context.progress.start(t("feature.cleanup.scanningApplicationUsage"));
    try {
      const [report, installedSoftware] = await Promise.all([inspectAppUsage(), inspectInstalledSoftwareUsage()]);
      state.appUsage = { ...report, installedSoftware };
      context.progress.done(t("feature.cleanup.applicationUsageDone"));
    } catch (error) {
      state.errors.appUsage = errorMessage(error);
      context.progress.fail(state.errors.appUsage);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "choose-archive-file", async () => {
    const selected = await open({ directory: false, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    state.archiveSource = selected;
    delete state.errors.archive;
    renderAndBind(context, state);
  });
  bindAction(context.root, "add-archive-plan-item", async () => {
    syncArchiveInputs(context, state);
    if (!state.archiveSource) {
      state.errors.archive = localize("Choose a regular file before adding an archive item.", "添加归档项前请选择普通文件。");
      renderAndBind(context, state);
      return;
    }
    try {
      await addArchivePlanItem(state.archiveSource, state.archiveSourceLabel);
      state.archiveItems = await listArchivePlanItems();
      state.archivePlan = null;
      state.archiveResult = null;
      state.archiveSource = "";
      delete state.errors.archive;
    } catch (error) {
      state.errors.archive = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "refresh-archive-plan-items", async () => {
    try {
      state.archiveItems = await listArchivePlanItems();
      delete state.errors.archive;
    } catch (error) {
      state.errors.archive = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "create-generic-archive-plan", async () => {
    syncArchiveInputs(context, state);
    state.archivePlan = null;
    state.archiveResult = null;
    try {
      state.archivePlan = await createGenericArchivePlan(state.archiveTargetDrive);
      delete state.errors.archive;
    } catch (error) {
      state.errors.archive = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "execute-generic-archive-plan", async () => {
    state.archiveResult = null;
    const plan = state.archivePlan;
    if (!plan) {
      state.errors.archive = localize("Create and review a selected-file archive preview first.", "请先创建并检查所选文件的归档预览。");
      renderAndBind(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "execute_generic_archive_plan",
        planId: plan.planId,
        riskLevel: "high",
        title: localize("Execute selected-file archive plan", "执行所选文件归档计划"),
        summary: localize("Copies each previewed file to the non-system target, verifies it, then removes the source without overwriting conflicts.", "将预览中的文件复制到非系统盘目标位置，验证后再移除源文件，且不会覆盖冲突文件。"),
        before: [
          { label: localize("Target root", "目标根目录"), value: plan.targetRoot },
          { label: localize("Files", "文件数"), value: String(plan.entries.length) },
          { label: localize("Estimated bytes", "预计字节数"), value: String(plan.estimatedBytes) },
          { label: localize("Conflicts", "冲突数"), value: String(plan.entries.filter((entry) => entry.conflict).length) },
        ],
        warnings: plan.warnings,
        execute: (confirmationToken) => executeGenericArchivePlan(plan.planId, confirmationToken),
      }) as GenericArchiveResult;
      state.archiveResult = result;
      state.archivePlan = null;
      state.archiveItems = await listArchivePlanItems();
      delete state.errors.archive;
    } catch (error) {
      state.errors.archive = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "scan-cleanup", () => refreshCleanup(context, state));
  bindAction(context.root, "create-cleanup-plan", async () => {
    const selectedIds = selectedCleanableIds(state);
    if (!selectedIds.length) {
      state.errors.createPlan = t("toast.selectCleanupCandidateFirst");
      renderAndBind(context, state);
      return;
    }
    state.selectedIds = selectedIds;
    state.plan = null;
    state.cleanupResult = null;
    context.progress.start(t("feature.cleanup.createPlan"));
    try {
      state.plan = await createCleanupPlan(selectedIds);
      delete state.errors.createPlan;
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    } catch (error) {
      state.errors.createPlan = errorMessage(error);
      context.progress.fail(state.errors.createPlan);
      renderAndBind(context, state);
    }
  });
  bindAction(context.root, "execute-cleanup-plan", async () => {
    if (!state.plan) {
      state.errors.executeCleanupResult = t("toast.createCleanupPlanFirst");
      renderAndBind(context, state);
      return;
    }
    state.cleanupResult = null;
    state.errors.executeCleanupResult = "";
    try {
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
      }) as CleanupResult;
      state.cleanupResult = result;
      delete state.errors.executeCleanupResult;
    } catch (error) {
      state.errors.executeCleanupResult = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
  });
  bindAction(context.root, "clear-download-cache", async () => {
    state.moveOperationResult = "";
    delete state.errors.utilityOperation;
    try {
      const result = await context.risk.run({
        command: "clear_download_cache",
        planId: "clear-download-cache",
        riskLevel: "medium",
        title: localize("Clear download cache", "清理下载缓存"),
        summary: localize("Clears managed download cache through a token-gated backend command.", "通过确认令牌保护的后端命令清理受管下载缓存。"),
        warnings: [localize("Only managed cache entries should be removed.", "只应移除 DevEnv Manager 受管的缓存条目。")],
        execute: clearDownloadCache,
      }) as OperationResult;
      state.moveOperationResult = result.message;
    } catch (error) {
      state.errors.utilityOperation = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "clean-dev-cache", async () => {
    state.moveOperationResult = "";
    delete state.errors.utilityOperation;
    try {
      const result = await context.risk.run({
        command: "clean_dev_cache",
        planId: "tool-npm",
        riskLevel: "medium",
        title: localize("Clean dev cache", "清理开发工具缓存"),
        summary: localize("Cleans selected development cache through a token-gated backend command.", "通过确认令牌保护的后端命令清理所选开发工具缓存。"),
        warnings: [localize("Review tool-specific cache scope before executing.", "执行前请检查对应工具的缓存范围。")],
        execute: (confirmationToken) => cleanDevCache("npm", confirmationToken),
      }) as OperationResult;
      state.moveOperationResult = result.message;
    } catch (error) {
      state.errors.utilityOperation = errorMessage(error);
    }
    renderAndBind(context, state);
  });
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
  bindAction(context.root, "choose-duplicate-scan-root", async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) return;
      state.duplicateScanRoot = selected;
      delete state.errors.duplicateFiles;
    } catch (error) {
      state.errors.duplicateFiles = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "clear-duplicate-scan-root", () => {
    state.duplicateScanRoot = "";
    delete state.errors.duplicateFiles;
    renderAndBind(context, state);
  });
  bindAction(context.root, "create-move-plan", async () => {
    syncMoveInputs(context, state);
    if (!state.moveSource) {
      state.errors.moveOperation = t("feature.cleanup.moveSourceRequired");
      renderAndBind(context, state);
      return;
    }
    delete state.errors.moveOperation;
    context.progress.start(t("feature.cleanup.createMove"));
    try {
      state.movePlan = await createMovePlan(state.moveSource, state.moveTargetDrive, state.moveMode);
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
    } catch (error) {
      state.errors.moveOperation = errorMessage(error);
      context.progress.fail(state.errors.moveOperation);
      renderAndBind(context, state);
    }
  });
  bindAction(context.root, "execute-move-plan", async () => {
    if (!state.movePlan) {
      state.errors.moveOperation = t("toast.createMovePlanFirst");
      renderAndBind(context, state);
      return;
    }
    state.moveOperationResult = "";
    delete state.errors.moveOperation;
    try {
      const result = await context.risk.run({
        command: "execute_move_plan",
        planId: state.movePlan.planId,
        riskLevel: "high",
        backupReceipt: state.movePlan.target,
        title: localize("Execute move plan", "执行搬家计划"),
        summary: localize("Moves or archives selected files using a backend plan and token gate.", "使用后端计划和确认令牌搬移或归档所选文件。"),
        warnings: [localize("Review source, target drive, and rollback options.", "请检查源目录、目标盘和回滚选项。")],
        execute: (confirmationToken) => executeMovePlan(state.movePlan!, confirmationToken),
      }) as MoveResult;
      state.moveOperationResult = localize(
        `${result.success ? "Move completed" : "Move completed with failures"}: ${result.movedItems} item(s), rollback ${result.rollbackId || "not available"}.`,
        `${result.success ? "搬家完成" : "搬家完成但存在失败项"}：已处理 ${result.movedItems} 项，回滚标识 ${result.rollbackId || "不可用"}。`,
      );
      state.movePlan = null;
      state.rollbackRecords = await listRollbackRecords();
    } catch (error) {
      state.errors.moveOperation = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "rollback-move", async () => {
    const rollbackId = valueOf(state.rollbackRecords[0], "rollbackId", "");
    if (!rollbackId) {
      state.errors.moveOperation = localize("No rollback record is available.", "当前没有可用的回滚记录。");
      renderAndBind(context, state);
      return;
    }
    state.moveOperationResult = "";
    delete state.errors.moveOperation;
    try {
      const result = await context.risk.run({
        command: "rollback_move",
        planId: rollbackId,
        riskLevel: "high",
        title: localize("Rollback move", "回滚搬家操作"),
        summary: localize("Rolls back a previous move operation with a backend token.", "使用后端确认令牌回滚之前的搬家操作。"),
        warnings: [localize("Review rollback record before execution.", "执行前请检查回滚记录。")],
        execute: (confirmationToken) => rollbackMove(rollbackId, confirmationToken),
      }) as OperationResult;
      state.moveOperationResult = result.message;
      state.rollbackRecords = await listRollbackRecords();
    } catch (error) {
      state.errors.moveOperation = errorMessage(error);
    }
    renderAndBind(context, state);
  });
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
      state.errors.expansionResult = errorMessage(error);
      context.progress.fail(state.errors.expansionResult);
      renderAndBind(context, state);
    }
  });
  bindAction(context.root, "execute-expansion-plan", async () => {
    if (!state.expansionPlan) {
      state.errors.expansionResult = t("feature.cleanup.createExpansionFirst");
      renderAndBind(context, state);
      return;
    }
    state.expansionResult = null;
    state.errors.expansionResult = "";
    state.expansionBackupReceipt = context.root.querySelector<HTMLInputElement>("#cleanup-expansion-backup-receipt")?.value.trim() || "";
    if (state.expansionPlan.backupRequired && !state.expansionBackupReceipt) {
      state.errors.expansionResult = t("feature.cleanup.expansionBackupReceiptRequired");
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      return;
    }
    try {
      const result = await context.risk.run({
        command: "execute_expansion_plan",
        planId: state.expansionPlan.planId,
        riskLevel: "critical",
        backupReceipt: state.expansionBackupReceipt,
        backupRequired: state.expansionPlan.backupRequired,
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
  const [architecture, overview, diskOverview, scan, rollbackRecords, archiveItems] = await Promise.allSettled([
    storageCleanupArchitecture(),
    inspectMaintenanceOverview(),
    inspectDiskOverview(),
    scanCleanupTargets(),
    listRollbackRecords(),
    listArchivePlanItems(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  applySettled(state, "architecture", architecture);
  applySettled(state, "overview", overview);
  applySettled(state, "diskOverview", diskOverview);
  applySettled(state, "scan", scan);
  applySettled(state, "rollbackRecords", rollbackRecords);
  applySettled(state, "archiveItems", archiveItems);
  state.selectedIds = defaultSelectedIds(state);
  state.plan = null;
  state.cleanupResult = null;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function syncArchiveInputs(context: FeatureContext, state: CleanupWorkbenchState): void {
  state.archiveSource = context.root.querySelector<HTMLInputElement>("#cleanup-archive-source")?.value.trim() || state.archiveSource;
  state.archiveSourceLabel = context.root.querySelector<HTMLInputElement>("#cleanup-archive-source-label")?.value.trim() || localize("manual selection", "手动选择");
  state.archiveTargetDrive = context.root.querySelector<HTMLInputElement>("#cleanup-archive-target-drive")?.value.trim() || state.archiveTargetDrive;
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
  context.progress.start(t("feature.cleanup.refreshingDiskOverview"));
  try {
    state.diskOverview = await inspectDiskOverview();
    delete state.errors.diskOverview;
    context.progress.done(t("feature.cleanup.diskOverviewDone"));
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
  state.duplicateScanRoot = context.root.querySelector<HTMLInputElement>("#cleanup-duplicate-scan-root")?.value.trim() ?? state.duplicateScanRoot;
  const threshold = Number(context.root.querySelector<HTMLInputElement>("#cleanup-duplicate-min-size")?.value ?? state.duplicateScanMinSizeMb);
  state.duplicateScanMinSizeMb = Number.isFinite(threshold) ? Math.max(1, Math.floor(threshold)) : 100;
  state.duplicateScanStatus = "running";
  state.duplicateGroups = [];
  state.duplicateScanElapsedMs = 0;
  state.duplicateScanCompletedAt = "";
  delete state.errors.duplicateFiles;
  context.progress.start(t("feature.cleanup.scanningDuplicates"));
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
  const startedAt = performance.now();
  try {
    // An empty root lets the backend choose a safe user folder. An explicit
    // root is useful for focused scans and disposable smoke-test fixtures.
    state.duplicateGroups = await scanDuplicateLargeFiles(state.duplicateScanRoot, state.duplicateScanMinSizeMb);
    state.duplicateGroupsPage = 1;
    state.duplicateScanElapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
    state.duplicateScanCompletedAt = new Date().toLocaleString();
    state.duplicateScanStatus = state.duplicateGroups.length ? "completedWithResults" : "completedEmpty";
    delete state.errors.duplicateFiles;
    context.progress.done(t("feature.cleanup.duplicateScanDone"));
  } catch (error) {
    state.duplicateScanElapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
    state.duplicateScanCompletedAt = new Date().toLocaleString();
    state.duplicateScanStatus = "failed";
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
  context.progress.start(kind === "desktop" ? t("feature.cleanup.creatingDesktopArchivePlan") : t("feature.cleanup.creatingDownloadsArchivePlan"));
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
      title: kind === "desktop" ? localize("Execute desktop archive plan", "执行桌面归档计划") : localize("Execute downloads archive plan", "执行下载目录归档计划"),
      summary: kind === "desktop" ? localize("Archives selected desktop files after preview and token confirmation.", "预览并确认令牌后归档所选桌面文件。") : localize("Archives selected Downloads files after preview and token confirmation.", "预览并确认令牌后归档所选下载目录文件。"),
      before: [
        { label: localize("Source", "源目录"), value: plan.source },
        { label: localize("Target", "目标目录"), value: plan.target },
        { label: t("feature.cleanup.bytes"), value: String(plan.estimatedBytes) },
      ],
      after: [
        { label: t("feature.cleanup.resultCleaned"), value: localize("Moved items and failures are rendered in the Cleanup page result panel.", "已搬移项和失败项会显示在清理页结果区。") },
        { label: t("feature.cleanup.resultRecovery"), value: localize("Use target folder, rollback record, or report summary to restore files.", "可通过目标目录、回滚记录或报告摘要恢复文件。") },
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
  context.root.querySelectorAll<HTMLButtonElement>("[data-archive-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await removeArchivePlanItem(button.dataset.archiveRemove || "");
        state.archiveItems = await listArchivePlanItems();
        state.archivePlan = null;
        state.archiveResult = null;
        delete state.errors.archive;
      } catch (error) {
        state.errors.archive = errorMessage(error);
      }
      renderAndBind(context, state);
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-app-usage-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await openAnalysisPath(button.dataset.appUsageOpen || "");
        state.moveOperationResult = result.message;
      } catch (error) {
        state.errors.appUsage = errorMessage(error);
      }
      renderAndBind(context, state);
    });
  });
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
function applySettled(state: CleanupWorkbenchState, key: "archiveItems", result: PromiseSettledResult<ArchivePlanItem[]>): void;
function applySettled(state: CleanupWorkbenchState, key: keyof CleanupWorkbenchState, result: PromiseSettledResult<unknown>): void {
  if (result.status === "fulfilled") {
    (state as unknown as Record<string, unknown>)[key] = result.value;
  } else {
    state.errors[String(key)] = errorMessage(result.reason);
  }
}

function renderAndBind(context: FeatureContext, state: CleanupWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
