import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { bindAction, revealResult, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import type { ArchivePlanItem, CleanupArchitecture, CleanupResult, CleanupScanReport, DiskVolumeInfo, DuplicateGroup, ExpansionResult, FolderUsageReport, GenericArchiveResult, LargeFileItem, MaintenanceOverview, MoveResult, OperationResult, PartitionLayoutReport, RecycleBinCleanupResult, RecycleBinReport, RollbackRecord } from "../../types";
import { addArchivePlanItem, cleanDevCache, cleanSelectedTargets, clearDownloadCache, createCDriveExpansionPlan, createCleanupPlan, createDesktopArchivePlan, createDesktopCleanupPlan, createDownloadsArchivePlan, createGenericArchivePlan, createMovePlan, createRecycleBinCleanupPlan, executeCDriveExpansion, executeDesktopArchivePlan, executeDesktopCleanupPlan, executeDownloadsArchivePlan, executeGenericArchivePlan, executeMovePlan, executeRecycleBinCleanupPlan, inspectAppUsage, inspectDesktop, inspectDiskOverview, inspectDownloads, inspectInstalledSoftwareUsage, inspectMaintenanceOverview, inspectPartitionLayout, inspectRecycleBin, listArchivePlanItems, listRollbackRecords, openAnalysisPath, openRecycleBin, removeArchivePlanItem, rollbackMove, scanCleanupTargets, scanDuplicateLargeFiles, scanLargeFiles, storageCleanupArchitecture } from "./api";
import { renderCleanupWorkbench } from "./render";
import { assessArchiveTarget, recommendedArchiveTarget } from "./archiveTargets";
import type { CleanupWorkbenchState } from "./state";

type ArchiveTargetKind = "generic" | "desktop" | "downloads";

export function bindCleanupEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-cleanup-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.cleanupView;
      if (view !== "quick" && view !== "space" && view !== "advanced") return;
      state.activeView = view;
      renderAndBind(context, state);
      revealResult(context.root, `[data-testid='cleanup-${view}-view']`);
    });
  });
  bindCleanupCandidateSelection(context, state);
  bindDesktopSelection(context, state);
  bindRecycleBinSelection(context, state);
  bindArchiveTargetEvents(context, state);
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
    revealResult(context.root, "[data-testid='cleanup-application-usage-result']");
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
    revealResult(context.root, "[data-testid='cleanup-generic-archive-plan-preview']");
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
    revealResult(context.root, "[data-testid='cleanup-generic-archive-result']");
  });
  bindAction(context.root, "scan-cleanup", () => {
    state.activeView = "quick";
    return refreshCleanup(context, state, true);
  });
  bindAction(context.root, "jump-cleanup-results", () => showCleanupTarget(context, state, "[data-testid='cleanup-scan-result']"));
  bindAction(context.root, "jump-recycle-bin", () => showCleanupTarget(context, state, "[data-testid='cleanup-recycle-bin-section']"));
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
      revealResult(context.root, "[data-testid='cleanup-plan-section']");
    } catch (error) {
      state.errors.createPlan = errorMessage(error);
      context.progress.fail(state.errors.createPlan);
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='cleanup-plan-section']");
    }
  });
  bindAction(context.root, "run-selected-cleanup", async () => {
    const selectedIds = selectedCleanableIds(state);
    if (!selectedIds.length) {
      state.errors.createPlan = t("toast.selectCleanupCandidateFirst");
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='cleanup-scan-result']");
      return;
    }
    state.selectedIds = selectedIds;
    state.plan = null;
    state.cleanupResult = null;
    delete state.errors.createPlan;
    context.progress.start(t("feature.cleanup.createPlan"));
    try {
      state.plan = await createCleanupPlan(selectedIds);
      context.progress.done(t("toast.planReady"));
      await executeCurrentCleanupPlan(context, state, true);
    } catch (error) {
      state.errors.createPlan = errorMessage(error);
      context.progress.fail(state.errors.createPlan);
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='cleanup-plan-section']");
    }
  });
  bindAction(context.root, "execute-cleanup-plan", async () => {
    if (!state.plan) {
      state.errors.executeCleanupResult = t("toast.createCleanupPlanFirst");
      renderAndBind(context, state);
      return;
    }
    await executeCurrentCleanupPlan(context, state, false);
  });
  bindAction(context.root, "clear-download-cache", async () => {
    state.cacheOperationResult = "";
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
      state.cacheOperationResult = result.message;
    } catch (error) {
      state.errors.utilityOperation = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-cache-operation-result']");
  });
  bindAction(context.root, "clean-dev-cache", async () => {
    state.cacheOperationResult = "";
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
      state.cacheOperationResult = result.message;
    } catch (error) {
      state.errors.utilityOperation = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-cache-operation-result']");
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
      revealResult(context.root, "[data-testid='cleanup-move-plan-result']");
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
    revealResult(context.root, "[data-testid='cleanup-move-operation-result']");
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
  bindAction(context.root, "inspect-desktop", () => refreshDesktop(context, state));
  bindAction(context.root, "select-all-desktop-candidates", () => {
    state.desktopSelectedPaths = Array.from(context.root.querySelectorAll<HTMLInputElement>("[data-desktop-selection]:not(:disabled)"))
      .map((input) => input.value);
    renderAndBind(context, state);
  });
  bindAction(context.root, "clear-desktop-selection", () => {
    state.desktopSelectedPaths = [];
    state.desktopArchivePlan = null;
    state.desktopCleanupPlan = null;
    renderAndBind(context, state);
  });
  bindAction(context.root, "create-desktop-archive-plan", () => createArchivePlan(context, state, "desktop"));
  bindAction(context.root, "execute-desktop-archive-plan", () => executeArchivePlan(context, state, "desktop"));
  bindAction(context.root, "create-desktop-cleanup-plan", () => createDesktopRecyclePlan(context, state));
  bindAction(context.root, "execute-desktop-cleanup-plan", () => executeDesktopRecyclePlan(context, state));
  bindAction(context.root, "open-recycle-bin", async () => {
    try {
      const result = await openRecycleBin();
      state.desktopRecoveryResult = result.message;
      delete state.errors.desktopRecovery;
    } catch (error) {
      state.errors.desktopRecovery = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "open-managed-recycle-bin", () => openRecycleBinWindow(context, state));
  bindAction(context.root, "refresh-recycle-bin", () => refreshRecycleBin(context, state));
  bindAction(context.root, "select-nonempty-recycle-bin-volumes", () => {
    state.recycleBinSelectedDrives = state.recycleBin?.volumes
      .filter((volume) => volume.drive !== "unknown" && volume.itemCount > 0)
      .map((volume) => volume.drive) ?? [];
    state.recycleBinPlan = null;
    state.recycleBinOperationMessage = state.recycleBinSelectedDrives.length
      ? localize(`${state.recycleBinSelectedDrives.length} non-empty volume(s) selected. Review the scope, then create a plan.`, `已选择 ${state.recycleBinSelectedDrives.length} 个非空卷；请检查范围后创建计划。`)
      : localize("No non-empty Recycle Bin volume is available.", "没有可选择的非空回收站卷。");
    delete state.errors.recycleBin;
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
  });
  bindAction(context.root, "create-recycle-bin-cleanup-plan", () => createRecycleBinPlan(context, state));
  bindAction(context.root, "execute-recycle-bin-cleanup-plan", () => executeRecycleBinPlan(context, state));
  bindAction(context.root, "quick-empty-recycle-bin", () => quickEmptyRecycleBin(context, state));
  bindAction(context.root, "rollback-desktop-archive", () => rollbackArchive(context, state, "desktop"));
  bindAction(context.root, "create-downloads-archive-plan", () => createArchivePlan(context, state, "downloads"));
  bindAction(context.root, "execute-downloads-archive-plan", () => executeArchivePlan(context, state, "downloads"));
  bindAction(context.root, "rollback-downloads-archive", () => rollbackArchive(context, state, "downloads"));
  bindAction(context.root, "create-expansion-plan", async () => {
    context.progress.start(t("feature.cleanup.expansion"));
    try {
      state.expansionPlan = await createCDriveExpansionPlan();
      state.expansionResult = null;
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderCleanupWorkbench(state);
      bindCleanupEvents(context, state);
      revealResult(context.root, "[data-testid='cleanup-expansion-plan-preview']");
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
    revealResult(context.root, "[data-testid='cleanup-expansion-result']");
  });
  bindCleanupUtilityActions(context, state);
  bindCleanupPagination(context, state);
}

function syncMoveInputs(context: FeatureContext, state: CleanupWorkbenchState): void {
  state.moveSource = context.root.querySelector<HTMLInputElement>("#cleanup-move-source")?.value.trim() || state.moveSource;
  state.moveTargetDrive = context.root.querySelector<HTMLInputElement>("#cleanup-move-target-drive")?.value.trim() || state.moveTargetDrive;
  state.moveMode = context.root.querySelector<HTMLSelectElement>("#cleanup-move-mode")?.value.trim() || state.moveMode;
}

function bindDesktopSelection(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLInputElement>("[data-desktop-selection]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = new Set(state.desktopSelectedPaths);
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      state.desktopSelectedPaths = Array.from(selected);
      state.desktopArchivePlan = null;
      state.desktopCleanupPlan = null;
      state.desktopArchiveResult = null;
      state.desktopCleanupResult = null;
      delete state.errors.desktopArchive;
      delete state.errors.desktopCleanup;
    });
  });
}

async function refreshDesktop(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start(localize("Analyzing Desktop", "正在分析桌面"));
  try {
    state.desktop = await inspectDesktop();
    state.desktopSelectedPaths = [];
    state.desktopArchivePlan = null;
    state.desktopCleanupPlan = null;
    state.desktopArchiveResult = null;
    state.desktopCleanupResult = null;
    delete state.errors.desktopArchive;
    delete state.errors.desktopCleanup;
    context.progress.done(localize("Desktop analysis completed", "桌面分析完成"));
  } catch (error) {
    state.errors.desktopArchive = errorMessage(error);
    context.progress.fail(state.errors.desktopArchive);
  }
  if (!context.isCurrent()) return;
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-desktop-candidate-result']");
}

export async function refreshCleanup(context: FeatureContext, state: CleanupWorkbenchState, reveal = false): Promise<void> {
  state.scanStatus = "loading";
  renderAndBind(context, state);
  const [architecture, overview, diskOverview, scan, rollbackRecords, archiveItems, recycleBin] = await Promise.allSettled([
    storageCleanupArchitecture(),
    inspectMaintenanceOverview(),
    inspectDiskOverview(),
    scanCleanupTargets(),
    listRollbackRecords(),
    listArchivePlanItems(),
    inspectRecycleBin(),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  applySettled(state, "architecture", architecture);
  applySettled(state, "overview", overview);
  applySettled(state, "diskOverview", diskOverview);
  applySettled(state, "scan", scan);
  state.scanStatus = scan.status === "fulfilled"
    ? scan.value.totalItems > 0 ? "results" : "empty"
    : "failed";
  applySettled(state, "rollbackRecords", rollbackRecords);
  applySettled(state, "archiveItems", archiveItems);
  applySettled(state, "recycleBin", recycleBin);
  reconcileRecycleBinSelection(state);
  applyRecommendedArchiveTargets(state);
  state.selectedIds = defaultSelectedIds(state);
  state.plan = null;
  state.cleanupResult = null;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
  if (reveal) revealResult(context.root, "[data-testid='cleanup-scan-result']");
}

function syncArchiveInputs(context: FeatureContext, state: CleanupWorkbenchState): void {
  state.archiveSource = context.root.querySelector<HTMLInputElement>("#cleanup-archive-source")?.value.trim() || state.archiveSource;
  state.archiveSourceLabel = context.root.querySelector<HTMLInputElement>("#cleanup-archive-source-label")?.value.trim() || localize("manual selection", "手动选择");
  state.archiveTargetDrive = context.root.querySelector<HTMLSelectElement>("#cleanup-archive-target-drive")?.value.trim() || state.archiveTargetDrive;
}

function bindArchiveTargetEvents(context: FeatureContext, state: CleanupWorkbenchState): void {
  const controls: Array<{ kind: ArchiveTargetKind; selectId: string }> = [
    { kind: "generic", selectId: "cleanup-archive-target-drive" },
    { kind: "desktop", selectId: "cleanup-desktop-target-drive" },
    { kind: "downloads", selectId: "cleanup-downloads-target-drive" },
  ];
  controls.forEach(({ kind, selectId }) => {
    context.root.querySelector<HTMLSelectElement>(`#${selectId}`)?.addEventListener("change", (event) => {
      setArchiveTarget(state, kind, (event.target as HTMLSelectElement).value);
      renderAndBind(context, state);
    });
    bindAction(context.root, `use-recommended-${kind}-archive-target`, () => {
      const recommended = recommendedArchiveTarget(state.diskOverview);
      if (!recommended) {
        state.errors[archiveTargetErrorKey(kind)] = localize(
          "No writable non-system archive target with sufficient free space was detected.",
          "未检测到可写、非系统且空间充足的归档目标。",
        );
      } else {
        setArchiveTarget(state, kind, recommended);
      }
      renderAndBind(context, state);
    });
    bindAction(context.root, `choose-${kind}-archive-target`, async () => {
      try {
        const selected = await open({ directory: true, multiple: false });
        if (!selected || Array.isArray(selected)) return;
        const assessment = assessArchiveTarget(selected, state.diskOverview);
        if (!assessment.eligible) {
          state.errors[archiveTargetErrorKey(kind)] = archiveTargetAssessmentMessage(assessment.reason);
        } else {
          setArchiveTarget(state, kind, selected);
        }
      } catch (error) {
        state.errors[archiveTargetErrorKey(kind)] = errorMessage(error);
      }
      renderAndBind(context, state);
    });
  });
}

function setArchiveTarget(state: CleanupWorkbenchState, kind: ArchiveTargetKind, value: string): void {
  const target = value.trim();
  if (kind === "generic") {
    state.archiveTargetDrive = target;
    state.archivePlan = null;
  } else if (kind === "desktop") {
    state.desktopTargetDrive = target;
    state.desktopArchivePlan = null;
  } else {
    state.downloadsTargetDrive = target;
    state.downloadsArchivePlan = null;
  }
  delete state.errors[archiveTargetErrorKey(kind)];
}

function archiveTargetErrorKey(kind: ArchiveTargetKind): string {
  return kind === "generic" ? "archive" : kind === "desktop" ? "desktopArchive" : "downloadsArchive";
}

function applyRecommendedArchiveTargets(state: CleanupWorkbenchState): void {
  const recommended = recommendedArchiveTarget(state.diskOverview);
  const validOrRecommended = (current: string): string => current && assessArchiveTarget(current, state.diskOverview).eligible
    ? current
    : recommended;
  state.archiveTargetDrive = validOrRecommended(state.archiveTargetDrive);
  state.desktopTargetDrive = validOrRecommended(state.desktopTargetDrive);
  state.downloadsTargetDrive = validOrRecommended(state.downloadsTargetDrive);
  state.moveTargetDrive = validOrRecommended(state.moveTargetDrive);
}

function archiveTargetAssessmentMessage(reason: string): string {
  if (reason === "system-volume") return localize("The system volume cannot be used because archiving there would not release system-drive space.", "不能使用系统卷，因为归档到系统卷无法释放系统盘空间。");
  if (reason === "read-only") return localize("The selected volume is read-only.", "所选卷为只读卷。");
  if (reason === "removable") return localize("Removable volumes are excluded from automatic archive workflows.", "自动归档工作流不使用可移动卷。");
  if (reason === "insufficient-space") return localize("The selected volume does not have the minimum required free space.", "所选卷没有达到最低可用空间要求。");
  if (reason === "unknown-volume") return localize("The selected folder is not on a currently detected local volume.", "所选文件夹不在当前已检测到的本地卷上。");
  return localize("Choose an absolute folder on an eligible local archive volume.", "请选择符合条件的本地归档卷上的绝对目录。");
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
  revealResult(context.root, "[data-testid='cleanup-disk-overview-result']");
}

async function refreshDiskOverview(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start(t("feature.cleanup.refreshingDiskOverview"));
  try {
    state.diskOverview = await inspectDiskOverview();
    applyRecommendedArchiveTargets(state);
    delete state.errors.diskOverview;
    context.progress.done(t("feature.cleanup.diskOverviewDone"));
  } catch (error) {
    state.errors.diskOverview = errorMessage(error);
    context.progress.fail(state.errors.diskOverview);
  }
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
  revealResult(context.root, "[data-testid='cleanup-disk-overview-result']");
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
  revealResult(context.root, "#cleanup-large-files");
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
  revealResult(context.root, "[data-testid='cleanup-duplicate-large-files-result']");
}

async function createArchivePlan(context: FeatureContext, state: CleanupWorkbenchState, kind: "desktop" | "downloads"): Promise<void> {
  syncMoveInputs(context, state);
  state.desktopTargetDrive = context.root.querySelector<HTMLSelectElement>("#cleanup-desktop-target-drive")?.value.trim() || state.desktopTargetDrive;
  state.downloadsTargetDrive = context.root.querySelector<HTMLSelectElement>("#cleanup-downloads-target-drive")?.value.trim() || state.downloadsTargetDrive;
  const targetDrive = kind === "desktop" ? state.desktopTargetDrive : state.downloadsTargetDrive;
  const errorKey = kind === "desktop" ? "desktopArchive" : "downloadsArchive";
  if (!targetDrive) {
    state.errors[errorKey] = localize("Choose an eligible archive target first.", "请先选择符合条件的归档目标。");
    renderAndBind(context, state);
    return;
  }
  if (kind === "desktop" && !state.desktopSelectedPaths.length) {
    state.errors.desktopArchive = localize("Select at least one eligible Desktop file first.", "请先勾选至少一个可处理的桌面文件。");
    renderAndBind(context, state);
    return;
  }
  context.progress.start(kind === "desktop" ? t("feature.cleanup.creatingDesktopArchivePlan") : t("feature.cleanup.creatingDownloadsArchivePlan"));
  try {
    if (kind === "desktop") {
      state.desktopArchivePlan = await createDesktopArchivePlan(targetDrive, state.desktopSelectedPaths);
      state.desktopArchiveResult = null;
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
    revealResult(context.root, kind === "desktop" ? "[data-testid='cleanup-desktop-archive-plan-result']" : "[data-testid='cleanup-downloads-archive-plan-result']");
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
    state.errors[errorKey] = kind === "desktop"
      ? localize("Create and review a Desktop archive plan first.", "请先创建并检查桌面归档计划。")
      : localize("Create and review a Downloads archive plan first.", "请先创建并检查下载目录归档计划。");
    context.root.innerHTML = renderCleanupWorkbench(state);
    bindCleanupEvents(context, state);
    return;
  }
  if (kind === "desktop") state.desktopArchiveResult = null;
  else state.downloadsArchiveResult = null;
  state.errors[`${errorKey}Result`] = "";
  try {
    const result = await context.risk.run({
      command: kind === "desktop" ? "execute_desktop_archive_plan" : "execute_downloads_archive_plan",
      actionId: kind === "desktop" ? "execute_desktop_archive_plan" : "execute_downloads_archive_plan",
      planId: plan.planId,
      riskLevel: "high",
      backupReceipt: plan.target,
      backupRequired: true,
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
    if (kind === "desktop") {
      state.desktopArchiveResult = result as MoveResult;
      state.desktopArchivePlan = null;
      state.desktopSelectedPaths = [];
      state.desktopWorkflowNotice = localize(
        "Archive completed: files were copied, SHA-256 verified, and removed from Desktop. No Recycle Bin step is required; that workflow is only an alternative for other selected files.",
        "归档已完成：文件已复制、通过 SHA-256 校验并从桌面移除。无需再执行回收站步骤；回收站仅用于处理其他已勾选文件的替代流程。",
      );
      state.desktop = await inspectDesktop();
      state.rollbackRecords = await listRollbackRecords();
    } else {
      state.downloadsArchiveResult = result as MoveResult;
      state.downloadsArchivePlan = null;
      state.downloads = await inspectDownloads();
      state.rollbackRecords = await listRollbackRecords();
    }
    delete state.errors[errorKey];
    delete state.errors[`${errorKey}Result`];
  } catch (error) {
    state.errors[errorKey] = errorMessage(error);
  }
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderCleanupWorkbench(state);
  bindCleanupEvents(context, state);
  revealResult(context.root, kind === "desktop" ? "[data-testid='cleanup-desktop-archive-execute-result']" : "[data-testid='cleanup-downloads-archive-execute-result']");
}

async function createDesktopRecyclePlan(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  state.desktopCleanupPlan = null;
  state.desktopCleanupResult = null;
  if (!state.desktopSelectedPaths.length) {
    state.errors.desktopCleanup = localize("Select at least one eligible Desktop file first.", "请先勾选至少一个可处理的桌面文件。");
    renderAndBind(context, state);
    return;
  }
  context.progress.start(localize("Creating Recycle Bin plan", "正在创建回收站清理计划"));
  try {
    state.desktopCleanupPlan = await createDesktopCleanupPlan(state.desktopSelectedPaths);
    delete state.errors.desktopCleanup;
    context.progress.done(t("toast.planReady"));
  } catch (error) {
    state.errors.desktopCleanup = errorMessage(error);
    context.progress.fail(state.errors.desktopCleanup);
  }
  if (!context.isCurrent()) return;
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-desktop-recycle-plan-result']");
}

async function executeDesktopRecyclePlan(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  const plan = state.desktopCleanupPlan;
  state.desktopCleanupResult = null;
  if (!plan) {
    state.errors.desktopCleanup = localize("Create and review a Recycle Bin plan first.", "请先创建并检查回收站清理计划。");
    renderAndBind(context, state);
    return;
  }
  try {
    state.desktopCleanupResult = await context.risk.run({
      command: "execute_desktop_cleanup_plan",
      actionId: "execute_desktop_cleanup_plan",
      planId: plan.planId,
      riskLevel: "medium",
      title: localize("Move selected Desktop files to Recycle Bin", "将所选桌面文件移入回收站"),
      summary: localize("Revalidates every selected file and uses the Windows Recycle Bin. No permanent deletion is performed.", "重新校验每个所选文件并使用 Windows 回收站，不执行永久删除。"),
      before: [
        { label: localize("Selected files", "所选文件"), value: String(plan.itemCount) },
        { label: localize("Estimated bytes", "预计大小"), value: String(plan.estimatedBytes) },
      ],
      after: [
        { label: localize("Recovery", "恢复"), value: localize("Open Recycle Bin and choose Restore.", "打开回收站并选择还原。") },
      ],
      warnings: plan.warnings,
      execute: (confirmationToken) => executeDesktopCleanupPlan(plan, confirmationToken),
    }) as MoveResult;
    delete state.errors.desktopCleanup;
    state.desktopCleanupPlan = null;
    state.desktopSelectedPaths = [];
    state.desktop = await inspectDesktop();
    state.desktopWorkflowNotice = localize(
      "Selected files were moved to Windows Recycle Bin. Use the separate Recycle Bin management panel to review or clean existing recycled items.",
      "所选文件已移入 Windows 回收站。请使用独立的回收站管理面板检查或清理已有回收项目。",
    );
  } catch (error) {
    state.errors.desktopCleanup = errorMessage(error);
  }
  if (!context.isCurrent()) return;
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-desktop-recycle-execute-result']");
}

async function openRecycleBinWindow(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  try {
    await openRecycleBin();
    state.recycleBinOperationMessage = localize("Windows Recycle Bin opened.", "Windows 回收站已打开。");
    delete state.errors.recycleBin;
  } catch (error) {
    state.recycleBinOperationMessage = "";
    state.errors.recycleBin = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function refreshRecycleBin(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start(localize("Refreshing Recycle Bin preview", "正在刷新回收站预览"));
  try {
    state.recycleBin = await inspectRecycleBin();
    reconcileRecycleBinSelection(state);
    state.recycleBinPlan = null;
    state.recycleBinOperationMessage = localize("Recycle Bin preview refreshed.", "回收站预览已刷新。");
    delete state.errors.recycleBin;
    context.progress.done(localize("Recycle Bin preview refreshed", "回收站预览已刷新"));
  } catch (error) {
    state.recycleBinOperationMessage = "";
    state.errors.recycleBin = errorMessage(error);
    context.progress.fail(state.errors.recycleBin);
  }
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
}

async function createRecycleBinPlan(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  state.recycleBinPlan = null;
  if (!state.recycleBin) {
    state.errors.recycleBin = localize("Refresh the Recycle Bin preview first.", "请先刷新回收站预览。");
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
    return;
  }
  if (!state.recycleBinSelectedDrives.length) {
    state.errors.recycleBin = localize("Select at least one Recycle Bin source volume.", "请至少选择一个回收站来源卷。");
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
    return;
  }
  context.progress.start(localize("Creating snapshot-based Recycle Bin cleanup plan", "正在创建基于快照的回收站清理计划"));
  try {
    state.recycleBinPlan = await createRecycleBinCleanupPlan(state.recycleBinSelectedDrives);
    state.recycleBinOperationMessage = localize("Snapshot-based cleanup plan created. Review the volume scope before execution.", "已创建基于快照的清理计划，请在执行前检查来源卷范围。");
    delete state.errors.recycleBin;
    context.progress.done(t("toast.planReady"));
  } catch (error) {
    state.recycleBinOperationMessage = "";
    state.errors.recycleBin = errorMessage(error);
    context.progress.fail(state.errors.recycleBin);
  }
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-recycle-bin-plan-preview']");
}

async function executeRecycleBinPlan(context: FeatureContext, state: CleanupWorkbenchState, compact = false): Promise<void> {
  const plan = state.recycleBinPlan;
  if (!plan) {
    state.errors.recycleBin = localize("Create and review a Recycle Bin cleanup plan first.", "请先创建并检查回收站清理计划。");
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
    return;
  }
  state.recycleBinResult = null;
  let executionStarted = false;
  try {
    const result = await context.risk.run({
      command: "execute_recycle_bin_cleanup_plan",
      actionId: "execute_recycle_bin_cleanup_plan",
      planId: plan.planId,
      riskLevel: "critical",
      presentation: compact ? "compact" : "standard",
      confirmLabel: compact ? localize("Permanently empty selected volumes", "永久清空所选卷") : undefined,
      backupRequired: false,
      title: localize("Permanently clean selected Recycle Bin volumes", "永久清理所选回收站卷"),
      summary: localize("After a final snapshot recheck, Windows permanently empties each selected Recycle Bin source volume as a whole.", "最终重核快照后，Windows 会按卷整体永久清空所选回收站来源卷。"),
      before: [
        { label: localize("Selected volumes", "所选卷"), value: plan.selectedDrives.join(", ") },
        { label: localize("Snapshot items", "快照项目数"), value: String(plan.itemCount) },
        { label: localize("Estimated bytes", "预计大小"), value: String(plan.estimatedBytes) },
      ],
      after: [
        { label: localize("Verification", "验证"), value: localize("The backend rescans the selected volumes and reports remaining items.", "后端会重扫所选卷并报告剩余项目。") },
        { label: localize("Recovery", "恢复"), value: localize("Permanent cleanup cannot be undone through Windows Recycle Bin.", "永久清理后无法通过 Windows 回收站撤销。") },
      ],
      warnings: [
        localize("This operation is irreversible.", "此操作不可逆。"),
        localize("A detected snapshot change invalidates the plan, but Windows does not provide an atomic item-level lock for volume cleanup.", "检测到快照变化时计划会失效，但 Windows 的按卷清理不提供逐项原子锁。"),
        ...plan.warnings.map(recycleBinRiskWarning),
      ],
      execute: (confirmationToken) => {
        executionStarted = true;
        return executeRecycleBinCleanupPlan(plan.planId, confirmationToken);
      },
    }) as RecycleBinCleanupResult;
    state.recycleBinResult = result;
    state.recycleBinPlan = null;
    state.recycleBinSelectedDrives = [];
    const executionError = result.success
      ? ""
      : `${localize("Recycle Bin cleanup was incomplete", "回收站清理未完整完成")}：${result.failures.join("; ") || localize("post-cleanup verification failed", "清理后验证失败")}`;
    if (executionError) state.errors.recycleBin = executionError;
    else delete state.errors.recycleBin;
    try {
      state.recycleBin = await inspectRecycleBin();
      state.recycleBinOperationMessage = result.success
        ? localize("Recycle Bin cleanup completed and was rescanned.", "回收站清理已完成并已重新扫描。")
        : localize("Recycle Bin cleanup was incomplete; the remaining scope was rescanned.", "回收站清理未完整完成，已重新扫描剩余范围。");
    } catch (refreshError) {
      state.recycleBinOperationMessage = localize("Recycle Bin cleanup completed, but the final preview refresh failed.", "回收站清理已完成，但最终预览刷新失败。");
      state.errors.recycleBin = [
        executionError,
        `${localize("Cleanup ran, but the final UI refresh failed", "清理已执行，但最终界面刷新失败")}：${errorMessage(refreshError)}`,
      ].filter(Boolean).join("; ");
    }
  } catch (error) {
    if (executionStarted) state.recycleBinPlan = null;
    state.recycleBinOperationMessage = "";
    state.errors.recycleBin = errorMessage(error);
  }
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-recycle-bin-result']");
}

function bindRecycleBinSelection(context: FeatureContext, state: CleanupWorkbenchState): void {
  context.root.querySelectorAll<HTMLInputElement>("[data-recycle-bin-drive]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const drives = new Set(state.recycleBinSelectedDrives);
      if (checkbox.checked) drives.add(checkbox.value);
      else drives.delete(checkbox.value);
      state.recycleBinSelectedDrives = Array.from(drives).sort();
      state.recycleBinPlan = null;
      delete state.errors.recycleBin;
      renderAndBind(context, state);
    });
  });
}

function reconcileRecycleBinSelection(state: CleanupWorkbenchState): void {
  const available = new Set(state.recycleBin?.volumes.map((volume) => volume.drive).filter((drive) => drive !== "unknown") ?? []);
  state.recycleBinSelectedDrives = state.recycleBinSelectedDrives.filter((drive) => available.has(drive));
}

async function rollbackArchive(context: FeatureContext, state: CleanupWorkbenchState, kind: "desktop" | "downloads"): Promise<void> {
  const rollbackId = kind === "desktop" ? state.desktopArchiveResult?.rollbackId : state.downloadsArchiveResult?.rollbackId;
  if (!rollbackId) {
    state.errors[kind === "desktop" ? "desktopRecovery" : "downloadsArchive"] = kind === "desktop"
      ? localize("No automatic Desktop archive rollback is available.", "当前没有可用的桌面归档自动回滚。")
      : localize("No automatic Downloads archive rollback is available.", "当前没有可用的下载目录归档自动回滚。");
    renderAndBind(context, state);
    return;
  }
  try {
    const result = await context.risk.run({
      command: "rollback_move",
      actionId: "rollback_move",
      planId: rollbackId,
      riskLevel: "high",
      title: kind === "desktop" ? localize("Restore Desktop archive", "恢复桌面归档") : localize("Restore Downloads archive", "恢复下载目录归档"),
      summary: localize("Verifies archived hashes and copies files back without overwriting files at their original locations.", "校验归档文件哈希，并在不覆盖原位置现有文件的前提下复制回去。"),
      warnings: [localize("Changed or conflicting files are refused and remain for manual review.", "已变化或冲突的文件会被拒绝并保留供人工检查。")],
      execute: (confirmationToken) => rollbackMove(rollbackId, confirmationToken),
    }) as OperationResult;
    state.rollbackRecords = await listRollbackRecords();
    if (kind === "desktop") {
      state.desktopRecoveryResult = result.message;
      state.desktopArchiveResult = null;
      state.desktop = await inspectDesktop();
      state.desktopWorkflowNotice = localize("Archived files were restored and Desktop was reanalyzed.", "归档文件已恢复，并已重新分析桌面。");
      delete state.errors.desktopRecovery;
    } else {
      state.downloadsRecoveryResult = result.message;
      state.downloadsArchiveResult = null;
      state.downloads = await inspectDownloads();
      delete state.errors.downloadsArchive;
    }
  } catch (error) {
    state.errors[kind === "desktop" ? "desktopRecovery" : "downloadsArchive"] = errorMessage(error);
  }
  if (!context.isCurrent()) return;
  renderAndBind(context, state);
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
function applySettled(state: CleanupWorkbenchState, key: "recycleBin", result: PromiseSettledResult<RecycleBinReport>): void;
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

function showCleanupTarget(context: FeatureContext, state: CleanupWorkbenchState, selector: string): void {
  state.activeView = "quick";
  renderAndBind(context, state);
  revealResult(context.root, selector);
}

async function quickEmptyRecycleBin(context: FeatureContext, state: CleanupWorkbenchState): Promise<void> {
  context.progress.start(localize("Preparing Recycle Bin safety review", "正在准备回收站安全检查"));
  try {
    state.recycleBin = await inspectRecycleBin();
    state.recycleBinSelectedDrives = state.recycleBin.volumes
      .filter((volume) => volume.drive !== "unknown" && volume.itemCount > 0)
      .map((volume) => volume.drive)
      .sort();
    if (!state.recycleBinSelectedDrives.length) {
      state.recycleBinOperationMessage = localize("Recycle Bin is already empty.", "回收站已经为空。");
      state.recycleBinPlan = null;
      delete state.errors.recycleBin;
      context.progress.done(state.recycleBinOperationMessage);
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
      return;
    }
    state.recycleBinPlan = await createRecycleBinCleanupPlan(state.recycleBinSelectedDrives);
    state.recycleBinOperationMessage = localize("Safety snapshot ready. Confirm the selected volume scope to continue.", "安全快照已就绪，请确认所选卷范围后继续。");
    delete state.errors.recycleBin;
    context.progress.done(t("toast.planReady"));
    await executeRecycleBinPlan(context, state, true);
  } catch (error) {
    state.errors.recycleBin = errorMessage(error);
    context.progress.fail(state.errors.recycleBin);
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='cleanup-recycle-bin-section']");
  }
}

async function executeCurrentCleanupPlan(context: FeatureContext, state: CleanupWorkbenchState, compact: boolean): Promise<void> {
  const plan = state.plan;
  if (!plan) return;
  state.cleanupResult = null;
  state.errors.executeCleanupResult = "";
  try {
    state.cleanupResult = await context.risk.run({
      command: "execute_cleanup_plan",
      planId: plan.planId,
      riskLevel: "medium",
      presentation: compact ? "compact" : "standard",
      confirmLabel: compact ? localize("Confirm cleanup", "确认清理") : undefined,
      title: t("feature.cleanup.executePlanTitle"),
      summary: t("feature.cleanup.executePlanSummary"),
      before: [
        { label: t("feature.cleanup.selected"), value: String(plan.selectedItems.length) },
        { label: t("feature.cleanup.bytes"), value: formatBytesForRisk(plan.estimatedBytes) },
      ],
      after: [
        { label: t("feature.cleanup.resultCleaned"), value: t("feature.cleanup.resultAvailableAfterExecute") },
        { label: t("feature.cleanup.resultRecovery"), value: t("feature.cleanup.resultRecoveryDetail") },
      ],
      warnings: [t("feature.cleanup.executePlanWarning"), t("feature.cleanup.executePlanRecoveryWarning"), ...plan.warnings],
      execute: (confirmationToken) => cleanSelectedTargets(plan, confirmationToken),
    }) as CleanupResult;
    state.plan = null;
    delete state.errors.executeCleanupResult;
  } catch (error) {
    state.errors.executeCleanupResult = errorMessage(error);
  }
  if (!context.isCurrent()) return;
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='cleanup-operation-result']");
}

function formatBytesForRisk(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function recycleBinRiskWarning(value: string): string {
  if (value === "permanent-removal") return localize("The selected volume scope is permanently emptied and cannot be restored through Windows Recycle Bin.", "所选卷范围会被永久清空，无法再通过 Windows 回收站还原。");
  if (value === "scope-by-volume") return localize("Windows clears the whole selected source volume; an item added after the final recheck could also be removed.", "Windows 会整体清空所选来源卷；最终重核后新增的项目也可能被移除。");
  if (value === "snapshot-must-match") return localize("The plan is rejected when the final recheck detects a snapshot change.", "最终重核检测到快照变化时会拒绝执行计划。");
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
