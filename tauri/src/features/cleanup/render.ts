import { formatBytes } from "../../core/format";
import type { CleanupCandidate, DiskVolumeInfo, DuplicateGroup, FolderUsageReport, LargeFileItem, MovePlan, MoveResult, RecycleBinItem, RecycleBinVolumeSummary } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderEmptyState, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import { eligibleArchiveTargets, isDriveRootSelection, targetMatchesVolume } from "./archiveTargets";
import type { CleanupWorkbenchState } from "./state";

const archiveTargetSelectors = {
  generic: {
    picker: "cleanup-generic-archive-target-picker",
    select: "cleanup-generic-archive-target-select",
    recommendedAction: "use-recommended-generic-archive-target",
    chooseAction: "choose-generic-archive-target",
  },
  desktop: {
    picker: "cleanup-desktop-archive-target-picker",
    select: "cleanup-desktop-archive-target-select",
    recommendedAction: "use-recommended-desktop-archive-target",
    chooseAction: "choose-desktop-archive-target",
  },
  downloads: {
    picker: "cleanup-downloads-archive-target-picker",
    select: "cleanup-downloads-archive-target-select",
    recommendedAction: "use-recommended-downloads-archive-target",
    chooseAction: "choose-downloads-archive-target",
  },
} as const;

export function renderCleanupWorkbench(state: CleanupWorkbenchState): string {
  const selected = selectedCleanableCandidates(state);
  return `
    <div class="feature-layout" data-testid="cleanup-page">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.cleanup.label")}</h2><p>${t("feature.cleanup.description")}</p></div></div>
        ${renderFeatureGuide("cleanup")}
        <div class="metrics">
          ${renderMetric(t("feature.cleanup.scanned"), valueOf(state.scan, "totalItems", "0"))}
          ${renderMetric(t("feature.cleanup.bytes"), valueOf(state.scan, "totalBytes", "0"))}
          ${renderMetric(t("feature.cleanup.rollbackRecords"), state.rollbackRecords.length)}
          ${renderMetric(t("feature.cleanup.selected"), selected.length)}
          ${renderMetric(t("feature.cleanup.selectedBytes"), formatBytes(sumBytes(selected)))}
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-cleanup", t("feature.cleanup.scan"), "primary")}
          ${renderActionButton("create-cleanup-plan", t("feature.cleanup.createPlan"))}
          ${renderActionButton("execute-cleanup-plan", t("feature.cleanup.executePlan"), "danger")}
          ${renderActionButton("clear-download-cache", t("feature.cleanup.clearDownloads"), "danger")}
          ${renderActionButton("clean-dev-cache", t("feature.cleanup.cleanDev"), "danger")}
          ${renderActionButton("create-move-plan", t("feature.cleanup.createMove"))}
          ${renderActionButton("execute-move-plan", t("feature.cleanup.executeMove"), "danger")}
          ${renderActionButton("rollback-move", t("feature.cleanup.rollbackMove"), "danger")}
          ${renderActionButton("inspect-c-drive-rescue", t("feature.cleanup.cRescue"), "primary")}
          ${renderActionButton("scan-large-files-c", t("feature.cleanup.scanLargeFiles"))}
        </div>
        ${state.errors.createPlan ? `<div class="error-state" data-testid="cleanup-inline-error">${escapeHtml(state.errors.createPlan)}</div>` : ""}
        <div class="form-grid environment-plan-input">
          <input id="cleanup-move-source" value="${escapeHtml(state.moveSource)}" readonly placeholder="${t("feature.cleanup.moveSource")}" />
          <input id="cleanup-move-target-drive" value="${escapeHtml(state.moveTargetDrive)}" placeholder="${t("feature.cleanup.moveTargetDrive")}" />
          <select id="cleanup-move-mode">
            <option value="archive" ${state.moveMode === "archive" ? "selected" : ""}>${t("feature.cleanup.moveModeArchive")}</option>
            <option value="junction" ${state.moveMode === "junction" ? "selected" : ""}>${t("feature.cleanup.moveModeJunction")}</option>
          </select>
          ${renderActionButton("choose-cleanup-move-source", t("feature.cleanup.chooseMoveSource"))}
        </div>
      </section>
      ${renderCDriveRescue(state)}
      ${renderPartitionExpansion(state)}
      ${renderApplicationUsage(state)}
      ${renderGenericArchive(state)}
      ${renderDuplicateFiles(state)}
      ${renderDesktopArchiveSection(state)}
      ${renderRecycleBinManagement(state)}
      ${renderDownloadsArchiveSection(state)}
      ${renderCleanupReport(state)}
      ${renderLargeFiles(state)}
      <section class="panel"><h2>${t("feature.cleanup.plans")}</h2>${renderCleanupPlan(state)}${state.errors.executeCleanupResult ? `<div class="error-state" data-testid="cleanup-execute-error">${escapeHtml(state.errors.executeCleanupResult)}</div>` : ""}${renderCleanupExecutionResult(state)}${state.errors.utilityOperation ? `<div class="error-state" data-testid="cleanup-utility-operation-error">${escapeHtml(state.errors.utilityOperation)}</div>` : ""}${state.errors.moveOperation ? `<div class="error-state" data-testid="cleanup-move-operation-error">${escapeHtml(state.errors.moveOperation)}</div>` : ""}${state.moveOperationResult ? `<div class="small-note" data-testid="cleanup-move-operation-result">${escapeHtml(state.moveOperationResult)}</div>` : ""}${state.movePlan ? renderObjectTable(state.movePlan, ["planId", "source", "target", "mode", "warnings"]) : ""}</section>
    </div>
  `;
}

function renderPartitionExpansion(state: CleanupWorkbenchState): string {
  const plan = state.expansionPlan;
  const result = state.expansionResult;
  const verifiedGrowth = result ? Math.max(0, result.afterTotal - result.beforeTotal) : 0;
  const verificationOutput = result?.success
    ? localize(`Capacity verification passed: C drive grew by ${formatBytes(verifiedGrowth)}.`, `容量验证通过：C 盘增加了 ${formatBytes(verifiedGrowth)}。`)
    : result
      ? `${t("feature.cleanup.expansionVerificationFailed")}${result.output.trim() ? `\n${result.output.trim()}` : ""}`
      : "";
  return `<section class="panel" data-testid="cleanup-partition-expansion-section">
    <div class="panel-head"><div><h2>${t("feature.cleanup.expansion")}</h2><p>${t("feature.cleanup.expansionDetail")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("create-expansion-plan", t("feature.cleanup.expansion"), "primary")}
      ${renderActionButton("execute-expansion-plan", t("feature.cleanup.executeExpansion"), "danger", !plan?.canExecute)}
    </div>
    ${state.errors.expansionResult ? `<div class="error-state" data-testid="cleanup-expansion-error">${escapeHtml(state.errors.expansionResult)}</div>` : ""}
    <div data-testid="cleanup-expansion-plan-preview">
      ${plan ? `<dl class="kv-list">
        <div><dt>${t("feature.cleanup.expansionPlanId")}</dt><dd>${escapeHtml(plan.planId)}</dd></div>
        <div><dt>${t("feature.cleanup.expansionMode")}</dt><dd>${escapeHtml(expansionModeLabel(plan.mode))}</dd></div>
        <div><dt>${t("feature.cleanup.estimatedAdded")}</dt><dd>${escapeHtml(formatBytes(plan.estimatedAddedBytes))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionCanExecute")}</dt><dd>${escapeHtml(plan.canExecute ? t("state.yes") : t("state.no"))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionRequiresAdmin")}</dt><dd>${escapeHtml(plan.requiresAdmin ? t("state.yes") : t("state.no"))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionBackupRequired")}</dt><dd>${escapeHtml(plan.backupRequired ? t("state.yes") : t("state.no"))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionExplanation")}</dt><dd>${escapeHtml(expansionExplanation(plan.mode, plan.explanation))}</dd></div>
      </dl>` : renderEmptyState(t("feature.cleanup.expansionNoPlan"), t("feature.cleanup.expansionNoPlanDetail"))}
    </div>
    <label class="field-label" for="cleanup-expansion-backup-receipt">${t("feature.cleanup.expansionBackupReceipt")}</label>
    <input id="cleanup-expansion-backup-receipt" data-testid="cleanup-expansion-backup-receipt" value="${escapeHtml(state.expansionBackupReceipt)}" placeholder="${t("feature.cleanup.expansionBackupReceiptPlaceholder")}" ${plan?.canExecute && plan.backupRequired ? "" : "disabled"} />
    <div data-testid="cleanup-expansion-result">
      ${result ? `<dl class="kv-list">
        <div><dt>${t("feature.cleanup.expansionPlanId")}</dt><dd>${escapeHtml(result.planId)}</dd></div>
        <div><dt>${t("feature.cleanup.expansionExecutionStatus")}</dt><dd>${escapeHtml(result.success ? t("state.yes") : t("state.no"))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionBeforeTotal")}</dt><dd>${escapeHtml(formatBytes(result.beforeTotal))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionAfterTotal")}</dt><dd>${escapeHtml(formatBytes(result.afterTotal))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionActualAdded")}</dt><dd>${escapeHtml(formatBytes(verifiedGrowth))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionBeforeFree")}</dt><dd>${escapeHtml(formatBytes(result.beforeFree))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionAfterFree")}</dt><dd>${escapeHtml(formatBytes(result.afterFree))}</dd></div>
        <div><dt>${t("feature.cleanup.expansionCommandOutput")}</dt><dd>${escapeHtml(verificationOutput)}</dd></div>
      </dl>` : renderEmptyState(t("feature.cleanup.expansionNoResult"), t("feature.cleanup.expansionNoResultDetail"))}
    </div>
  </section>`;
}

function expansionModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    safe_extend_unallocated: t("feature.cleanup.expansionModeSafeExtend"),
    delete_empty_adjacent_partition_then_extend: t("feature.cleanup.expansionModeDeleteEmpty"),
    blocked_by_recovery_partition: t("feature.cleanup.expansionModeRecoveryBlocked"),
    d_drive_not_adjacent_or_has_data: t("feature.cleanup.expansionModeDataBlocked"),
    different_physical_disk: t("feature.cleanup.expansionModeDifferentDisk"),
  };
  return labels[mode] ?? mode;
}

function expansionExplanation(mode: string, fallback: string): string {
  const explanations: Record<string, string> = {
    safe_extend_unallocated: t("feature.cleanup.expansionExplainSafeExtend"),
    delete_empty_adjacent_partition_then_extend: t("feature.cleanup.expansionExplainDeleteEmpty"),
    blocked_by_recovery_partition: t("feature.cleanup.expansionExplainRecoveryBlocked"),
    d_drive_not_adjacent_or_has_data: t("feature.cleanup.expansionExplainDataBlocked"),
    different_physical_disk: t("feature.cleanup.expansionExplainDifferentDisk"),
  };
  return explanations[mode] ?? fallback;
}

function renderApplicationUsage(state: CleanupWorkbenchState): string {
  const report = state.appUsage;
  const appItems = report ? [
    ...(report.wechat ? [report.wechat] : []),
    ...(report.qq ? [report.qq] : []),
    ...report.browsers,
    ...report.netDisks,
    ...report.videoEditors,
    ...report.gamePlatforms,
  ] : [];
  return `<section class="panel" data-testid="cleanup-application-usage-section">
    <div class="panel-head"><div><h2>${localize("Application storage usage", "应用存储占用")}</h2><p>${localize("Read-only estimates from known application data locations and Windows uninstall metadata. This never uninstalls applications or deletes install directories.", "根据已知应用数据目录和 Windows 卸载元数据进行只读估算；不会卸载应用或删除安装目录。")}</p></div></div>
    <div class="toolbar">${renderActionButton("inspect-application-usage", localize("Scan application usage", "扫描应用存储占用"), "primary")}</div>
    ${state.errors.appUsage ? `<div class="error-state" data-testid="cleanup-application-usage-error">${escapeHtml(state.errors.appUsage)}</div>` : ""}
    <div data-testid="cleanup-application-usage-result">
      ${report ? `<div class="table-wrap"><table><thead><tr><th>${localize("Application", "应用")}</th><th>${localize("Path", "路径")}</th><th>${localize("Estimated size", "估算大小")}</th><th>${localize("Evidence", "证据")}</th><th>${localize("Access", "访问")}</th></tr></thead><tbody>
        ${appItems.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.path || localize("Not detected", "未检测到"))}</td><td>${formatBytes(item.size)}</td><td>${localize("Known application data location", "已知应用数据目录")}${item.warnings.length ? `; ${escapeHtml(item.warnings.join("; "))}` : ""}</td><td>${item.path ? `<button data-app-usage-open="${escapeHtml(item.path)}" type="button">${localize("Open location", "打开位置")}</button>` : t("state.notAvailable")}</td></tr>`).join("")}
        ${report.installedSoftware.map((item) => `<tr><td>${escapeHtml(item.name)}${item.publisher ? ` - ${escapeHtml(item.publisher)}` : ""}</td><td>${escapeHtml(item.installLocation || localize("Not reported", "未报告"))}</td><td>${formatBytes(item.estimatedSize)}</td><td>${localize("Windows uninstall registry", "Windows 卸载注册信息")}; ${escapeHtml(item.suggestion)}</td><td>${item.installLocation ? `<button data-app-usage-open="${escapeHtml(item.installLocation)}" type="button">${localize("Open location", "打开位置")}</button>` : localize("Location unavailable", "位置不可用")}</td></tr>`).join("")}
      </tbody></table></div>` : renderEmptyState(localize("Application usage not scanned", "尚未扫描应用存储占用"), localize("Run the read-only scan to list detected application and installed-software evidence.", "运行只读扫描以列出检测到的应用和已安装软件证据。"))}
    </div>
    <div class="small-note"><strong>${localize("Protected boundary", "受保护边界")}</strong><p>${localize("System applications, browser credentials, chat databases, and protected paths are reported only at a safe summary level. Use Windows Apps & Features for uninstall decisions.", "系统应用、浏览器凭据、聊天数据库和受保护路径仅提供安全摘要；卸载决策请使用 Windows 应用和功能。")}</p></div>
  </section>`;
}

function renderGenericArchive(state: CleanupWorkbenchState): string {
  const plan = state.archivePlan;
  const result = state.archiveResult;
  return `<section class="panel" data-testid="cleanup-generic-archive-section">
    <div class="panel-head"><div><h2>${localize("Selected-file archive plan", "所选文件归档计划")}</h2><p>${localize("Add allowed regular files, preview source-to-target mappings and conflicts, then confirm execution. Desktop and Downloads bulk archive plans remain separate.", "添加允许的普通文件，预览源到目标的映射和冲突后确认执行；桌面和下载批量归档保持独立。")}</p></div></div>
    <div class="form-grid">
      <input id="cleanup-archive-source" value="${escapeHtml(state.archiveSource)}" readonly placeholder="${localize("Choose an allowed file", "选择允许的文件")}" />
      <input id="cleanup-archive-source-label" value="${escapeHtml(state.archiveSourceLabel)}" placeholder="${localize("Evidence/source label", "证据或来源标签")}" />
    </div>
    ${renderArchiveTargetPicker(state, "generic", "cleanup-archive-target-drive", state.archiveTargetDrive)}
    <div class="toolbar">
      ${renderActionButton("choose-archive-file", localize("Choose file", "选择文件"))}
      ${renderActionButton("add-archive-plan-item", localize("Add to archive list", "添加到归档列表"))}
      ${renderActionButton("refresh-archive-plan-items", localize("Refresh list", "刷新列表"))}
      ${renderActionButton("create-generic-archive-plan", localize("Create execution preview", "创建执行预览"), "primary")}
      ${renderActionButton("execute-generic-archive-plan", localize("Execute selected-file archive", "执行所选文件归档"), "danger")}
    </div>
    ${state.errors.archive ? `<div class="error-state" data-testid="cleanup-generic-archive-error">${escapeHtml(state.errors.archive)}</div>` : ""}
    <div data-testid="cleanup-generic-archive-items">${state.archiveItems.length ? `<div class="table-wrap"><table><thead><tr><th>${localize("Source", "来源")}</th><th>${localize("Size", "大小")}</th><th>${localize("Evidence", "证据")}</th><th>${localize("Added", "添加时间")}</th><th>${localize("Action", "操作")}</th></tr></thead><tbody>${state.archiveItems.map((item) => `<tr><td>${escapeHtml(item.path)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.addedAt)}</td><td><button data-archive-remove="${escapeHtml(item.id)}" type="button">${localize("Remove", "移除")}</button></td></tr>`).join("")}</tbody></table></div>` : renderEmptyState(localize("Archive list is empty", "归档列表为空"), localize("Choose an allowed regular file and add it to the list.", "选择允许的普通文件并添加到列表。"))}</div>
    <div data-testid="cleanup-generic-archive-plan-preview">${plan ? `<dl class="kv-list">
      <div><dt>${localize("Plan ID", "计划 ID")}</dt><dd>${escapeHtml(plan.planId)}</dd></div>
      <div><dt>${localize("Target root", "目标根目录")}</dt><dd>${escapeHtml(plan.targetRoot)}</dd></div>
      <div><dt>${localize("Estimated bytes", "预计大小")}</dt><dd>${formatBytes(plan.estimatedBytes)}</dd></div>
      <div><dt>${localize("Risk", "风险")}</dt><dd>${escapeHtml(plan.riskLevel)}</dd></div>
      ${plan.entries.map((entry) => `<div><dt>${escapeHtml(entry.source)}</dt><dd>${escapeHtml(entry.target)} - SHA-256 ${escapeHtml(entry.sha256)}${entry.conflict ? ` - ${localize("CONFLICT", "冲突")}: ${escapeHtml(entry.conflictReason)}` : ` - ${localize("ready", "就绪")}`}</dd></div>`).join("")}
      <div><dt>${localize("Warnings", "警告")}</dt><dd>${escapeHtml(plan.warnings.join("; "))}</dd></div>
    </dl>` : renderEmptyState(localize("No execution preview", "尚无执行预览"), localize("Create a plan to validate paths, target conflicts, and estimated size.", "创建计划以验证路径、目标冲突和预计大小。"))}</div>
    <div data-testid="cleanup-generic-archive-result">${result ? `<dl class="kv-list">
      <div><dt>${localize("Status", "状态")}</dt><dd>${result.success ? localize("Verified", "已验证") : localize("Completed with failures", "完成但存在失败")}</dd></div>
      <div><dt>${localize("Moved", "已移动")}</dt><dd>${result.movedItems} ${localize("item(s)", "项")}, ${formatBytes(result.movedBytes)}</dd></div>
      <div><dt>${localize("Skipped", "已跳过")}</dt><dd>${result.skippedItems}</dd></div>
      <div><dt>${localize("Verified targets", "已验证目标")}</dt><dd>${escapeHtml(result.verifiedTargets.join("; ") || localize("none", "无"))}</dd></div>
      <div><dt>${localize("Failures", "失败")}</dt><dd>${escapeHtml(result.failures.join("; ") || localize("none", "无"))}</dd></div>
      <div><dt>${localize("Receipt", "回执")}</dt><dd>${escapeHtml(result.receiptPath)}</dd></div>
      <div><dt>${localize("Rollback guidance", "回滚说明")}</dt><dd>${escapeHtml(result.rollbackGuidance.join("; ") || localize("No files moved", "没有移动文件"))}</dd></div>
    </dl>` : renderEmptyState(localize("No archive execution result", "尚无归档执行结果"), localize("Execution verification and rollback guidance appear here.", "执行验证和回滚说明会显示在这里。"))}</div>
  </section>`;
}

function renderCDriveRescue(state: CleanupWorkbenchState): string {
  const overview = state.overview;
  const partition = state.partition;
  const diskOverview = state.diskOverview.length ? state.diskOverview : overview?.volumes ?? [];
  return `<section class="panel" data-testid="cleanup-disk-overview-entry">
    <div class="panel-head"><div><h2>${t("feature.cleanup.cRescue")}</h2><p>${t("feature.cleanup.cRescueDetail")}</p></div></div>
    <div class="toolbar">${renderActionButton("inspect-disk-overview", localize("Refresh disk overview", "刷新磁盘概览"))}${renderActionButton("inspect-c-drive-rescue", t("feature.cleanup.cRescue"), "primary")}</div>
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.cFree"), overview ? formatBytes(overview.cDrive.freeBytes) : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.cUsed"), overview ? `${overview.cDrive.usedPercent.toFixed(1)}%` : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.safeCleanEstimate"), overview ? formatBytes(overview.safeCleanEstimate) : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.devCacheEstimate"), overview ? formatBytes(overview.devCacheEstimate) : t("state.notChecked"))}
    </div>
    ${state.errors.diskOverview ? `<p class="error-text" data-testid="cleanup-disk-overview-error">${escapeHtml(state.errors.diskOverview)}</p>` : ""}
    ${state.errors.cRescue ? `<p class="error-text">${escapeHtml(state.errors.cRescue)}</p>` : ""}
    ${overview ? renderStringList(t("feature.cleanup.suggestions"), overview.suggestions) : ""}
    <div data-testid="cleanup-disk-overview-result">${diskOverview.length ? renderVolumes(diskOverview) : renderEmptyState(t("state.notChecked"), t("feature.cleanup.partitionNotCheckedDetail"))}</div>
    ${partition ? renderPartition(partition) : renderEmptyState(t("feature.cleanup.partitionNotChecked"), t("feature.cleanup.partitionNotCheckedDetail"))}
    ${state.architecture ? renderStringList(t("feature.cleanup.safetyRules"), state.architecture.safetyRules) : ""}
    <div class="folder-overview-grid">
      ${renderFolderOverview(t("feature.cleanup.desktop"), state.desktop)}
      ${renderFolderOverview(t("feature.cleanup.downloads"), state.downloads)}
    </div>
  </section>`;
}

function renderDuplicateFiles(state: CleanupWorkbenchState): string {
  const paged = pageItems(state.duplicateGroups, state.duplicateGroupsPage, 10);
  return `<section class="panel" data-testid="cleanup-duplicate-large-files-entry">
    <div class="panel-head"><div><h2>${localize("Duplicate large files", "重复大文件")}</h2><p>${localize("Read-only duplicate scan. It does not delete files.", "只读扫描重复文件，不会删除任何文件。")}</p></div></div>
    <div class="form-grid">
      <input id="cleanup-duplicate-scan-root" data-testid="cleanup-duplicate-scan-root" value="${escapeHtml(state.duplicateScanRoot)}" readonly placeholder="${localize("Scan folder (blank uses Downloads)", "扫描目录（留空时使用下载目录）")}" />
      <input id="cleanup-duplicate-min-size" data-testid="cleanup-duplicate-min-size" type="number" min="1" step="1" value="${state.duplicateScanMinSizeMb}" aria-label="${localize("Minimum duplicate file size in MB", "重复文件最小大小（MB）")}" />
    </div>
    <div class="toolbar">${renderActionButton("choose-duplicate-scan-root", localize("Choose scan folder", "选择扫描目录"))}${renderActionButton("clear-duplicate-scan-root", localize("Use Downloads", "使用下载目录"))}${renderActionButton("scan-duplicate-large-files", localize("Scan duplicate large files", "扫描重复大文件"))}</div>
    ${state.errors.duplicateFiles ? `<p class="error-text" data-testid="cleanup-duplicate-large-files-error">${escapeHtml(state.errors.duplicateFiles)}</p>` : ""}
    ${renderDuplicateScanStatus(state)}
    <div data-testid="cleanup-duplicate-large-files-result">
      ${state.duplicateScanStatus === "completedWithResults" ? `<div class="table-wrap"><table><thead><tr><th>${localize("Hash", "哈希")}</th><th>${localize("Size", "大小")}</th><th>${localize("Files", "文件")}</th><th>${localize("Reclaimable", "可回收")}</th><th>${localize("Evidence", "证据")}</th></tr></thead><tbody>${paged.items.map(renderDuplicateGroup).join("")}</tbody></table></div>${renderPagination("cleanup-duplicate-large-files", paged.page, paged.totalPages, paged.total)}` : state.duplicateScanStatus === "completedEmpty" ? `<div data-testid="cleanup-duplicate-large-files-scan-result">${renderEmptyState(t("feature.cleanup.noDuplicateGroups"), t("feature.cleanup.duplicateScanCompleteEmptyDetail"))}</div>` : state.duplicateScanStatus === "running" ? `<div class="loading-state" role="status">${localize("Scanning duplicate files...", "正在扫描重复文件...")}</div>` : state.duplicateScanStatus === "failed" ? renderEmptyState(localize("Duplicate scan failed", "重复文件扫描失败"), localize("Review the persistent error above, adjust the folder, and retry.", "请查看上方持续显示的错误，调整目录后重试。")) : renderEmptyState(localize("No duplicate scan yet", "尚未扫描重复文件"), localize("Run the read-only scan to list duplicate groups.", "运行只读扫描以列出重复文件组。"))}
    </div>
  </section>`;
}

function renderDuplicateScanStatus(state: CleanupWorkbenchState): string {
  if (state.duplicateScanStatus === "notStarted") return "";
  const status = state.duplicateScanStatus === "running"
    ? localize("Scanning", "扫描中")
    : state.duplicateScanStatus === "completedWithResults"
      ? localize(`Completed with ${state.duplicateGroups.length} duplicate group(s)`, `扫描完成，共 ${state.duplicateGroups.length} 个重复组`)
      : state.duplicateScanStatus === "completedEmpty"
        ? localize("Scan complete - no duplicate groups found", "扫描完成，未发现重复组")
        : localize("Scan failed", "扫描失败");
  const root = state.duplicateScanRoot || localize("Downloads (automatic safe default)", "下载目录（自动安全默认值）");
  const elapsed = state.duplicateScanElapsedMs ? `${state.duplicateScanElapsedMs} ms` : localize("In progress", "进行中");
  return `<dl class="kv-list" data-testid="cleanup-duplicate-scan-status">
    <div><dt>${localize("Status", "状态")}</dt><dd>${escapeHtml(status)}</dd></div>
    <div><dt>${localize("Scan folder", "扫描目录")}</dt><dd>${escapeHtml(root)}</dd></div>
    <div><dt>${localize("Minimum size", "最小大小")}</dt><dd>${state.duplicateScanMinSizeMb} MB</dd></div>
    <div><dt>${localize("Duration", "耗时")}</dt><dd>${escapeHtml(elapsed)}</dd></div>
    ${state.duplicateScanCompletedAt ? `<div><dt>${localize("Completed at", "完成时间")}</dt><dd>${escapeHtml(state.duplicateScanCompletedAt)}</dd></div>` : ""}
  </dl>`;
}

function renderDuplicateGroup(group: DuplicateGroup): string {
  return `<tr>
    <td title="${escapeHtml(group.hash)}">${escapeHtml(group.hash.slice(0, 16))}</td>
    <td>${formatBytes(group.size)}</td>
    <td>${group.files.length}</td>
    <td>${formatBytes(group.reclaimableEstimate)}</td>
    <td><ul>${group.files.slice(0, 5).map((file) => `<li title="${escapeHtml(file.path)}">${escapeHtml(file.path)}${file.modifiedAt ? ` <small>${escapeHtml(file.modifiedAt)}</small>` : ""}<div class="row-actions compact"><button data-duplicate-file-open="${escapeHtml(file.path)}" type="button">${t("feature.cleanup.openLocation")}</button><button data-duplicate-file-copy="${escapeHtml(file.path)}" type="button">${t("feature.runtimes.copyPath")}</button></div></li>`).join("")}</ul></td>
  </tr>`;
}

function renderDesktopArchiveSection(state: CleanupWorkbenchState): string {
  const candidates = desktopCandidates(state.desktop);
  const selected = new Set(state.desktopSelectedPaths);
  return `<section class="panel" data-testid="cleanup-desktop-archive-section">
    <div class="panel-head"><div><h2>${localize("Desktop analysis, archive, and cleanup", "桌面分析、归档与清理")}</h2><p>${localize("Analyze first, select eligible regular files, then choose verified archive or Windows Recycle Bin.", "先分析并勾选符合条件的普通文件，再选择经过校验的归档或 Windows 回收站。")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("inspect-desktop", localize("Analyze Desktop", "分析桌面"), "primary")}
      ${renderActionButton("select-all-desktop-candidates", localize("Select eligible", "全选可处理项"))}
      ${renderActionButton("clear-desktop-selection", localize("Clear selection", "清空选择"))}
    </div>
    ${state.errors.desktopArchive ? `<p class="error-text" data-testid="cleanup-desktop-archive-error">${escapeHtml(state.errors.desktopArchive)}</p>` : ""}
    ${state.desktop ? renderFolderArchiveSummary(state.desktop) : renderEmptyState(localize("Desktop not analyzed yet", "尚未分析桌面"), localize("Run the read-only analysis before selecting files.", "请先运行只读分析，再选择文件。"))}
    <div data-testid="cleanup-desktop-candidate-result">${state.desktop ? renderDesktopCandidateTable(candidates, selected) : ""}</div>
    <div class="desktop-operation-grid">
      <div class="desktop-operation-section" data-testid="cleanup-desktop-archive-plan-section">
        <h3>${localize("Archive selected files", "归档所选文件")}</h3>
        <p>${localize("Copies to a non-system drive, verifies SHA-256, then removes the source. Existing files are never overwritten.", "复制到非系统盘、校验 SHA-256 后再移除源文件，绝不覆盖现有文件。")}</p>
        ${renderArchiveTargetPicker(state, "desktop", "cleanup-desktop-target-drive", state.desktopTargetDrive)}
        <div class="toolbar">
          ${renderActionButton("create-desktop-archive-plan", localize("Create archive preview", "创建归档预览"))}
          ${renderActionButton("execute-desktop-archive-plan", localize("Execute archive", "执行归档"), "danger")}
          ${state.desktopArchiveResult?.rollbackId ? renderActionButton("rollback-desktop-archive", localize("Restore archived files", "恢复已归档文件"), "danger") : ""}
        </div>
        <div data-testid="cleanup-desktop-archive-plan-result">${state.desktopArchivePlan ? renderArchivePlan(state.desktopArchivePlan) : renderEmptyState(localize("No archive preview", "尚无归档预览"), localize("Select files and create a preview before execution.", "勾选文件并在执行前创建预览。"))}</div>
        <div data-testid="cleanup-desktop-archive-execute-result">${state.desktopArchiveResult ? renderMoveResult(state.desktopArchiveResult) : renderEmptyState(localize("No archive result", "尚无归档结果"), localize("Verified receipts and failures appear here.", "校验回执和失败原因会显示在这里。"))}</div>
        ${state.desktopWorkflowNotice ? `<div class="small-note" data-testid="cleanup-desktop-workflow-notice"><strong>${localize("Next step", "下一步")}</strong><p>${escapeHtml(state.desktopWorkflowNotice)}</p></div>` : ""}
      </div>
      <div class="desktop-operation-section" data-testid="cleanup-desktop-recycle-section">
        <h3>${localize("Move selected files to Recycle Bin", "将所选文件移入回收站")}</h3>
        <p>${localize("Alternative to archive: moves the currently selected Desktop files to Windows Recycle Bin. Files already archived do not need this step. Permanent deletion is not available here.", "这是归档的替代操作：把当前勾选的桌面文件移入 Windows 回收站。已成功归档的文件不需要再执行此步骤；这里不提供永久删除。")}</p>
        <div class="toolbar">
          ${renderActionButton("create-desktop-cleanup-plan", localize("Create Recycle Bin preview", "创建回收站预览"))}
          ${renderActionButton("execute-desktop-cleanup-plan", localize("Move to Recycle Bin", "移入回收站"), "danger")}
          ${renderActionButton("open-recycle-bin", localize("Open Recycle Bin", "打开回收站"))}
        </div>
        ${state.errors.desktopCleanup ? `<p class="error-text" data-testid="cleanup-desktop-recycle-error">${escapeHtml(state.errors.desktopCleanup)}</p>` : ""}
        <div data-testid="cleanup-desktop-recycle-plan-result">${state.desktopCleanupPlan ? renderArchivePlan(state.desktopCleanupPlan) : renderEmptyState(localize("No Recycle Bin preview", "尚无回收站预览"), localize("Select files and create a preview before execution.", "勾选文件并在执行前创建预览。"))}</div>
        <div data-testid="cleanup-desktop-recycle-execute-result">${state.desktopCleanupResult ? renderMoveResult(state.desktopCleanupResult) : renderEmptyState(localize("No Recycle Bin result", "尚无回收站结果"), localize("Execution receipts and recovery guidance appear here.", "执行回执和恢复说明会显示在这里。"))}</div>
      </div>
    </div>
    ${state.errors.desktopRecovery ? `<p class="error-text" data-testid="cleanup-desktop-recovery-error">${escapeHtml(state.errors.desktopRecovery)}</p>` : ""}
    <div data-testid="cleanup-desktop-archive-rollback" class="small-note"><strong>${localize("Recovery", "恢复")}</strong><p>${escapeHtml(state.desktopRecoveryResult || localize("Archived files can be restored by their hash-verified rollback receipt. Recycled files are restored from Windows Recycle Bin.", "归档文件可通过哈希校验的回滚回执恢复；回收站文件请从 Windows 回收站还原。"))}</p></div>
  </section>`;
}

function renderRecycleBinManagement(state: CleanupWorkbenchState): string {
  const report = state.recycleBin;
  const selected = new Set(state.recycleBinSelectedDrives);
  const plan = state.recycleBinPlan;
  const result = state.recycleBinResult;
  return `<section class="panel" data-testid="cleanup-recycle-bin-section">
    <div class="panel-head"><div><h2>${localize("Windows Recycle Bin", "Windows 回收站")}</h2><p>${localize("Read the current user's Recycle Bin, select source volumes, review a snapshot, then confirm permanent volume-scoped cleanup. Nothing is selected by default.", "读取当前用户的回收站，选择来源卷并检查快照后，再确认按卷永久清理；默认不选择任何卷。")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("refresh-recycle-bin", localize("Refresh preview", "刷新预览"), "primary")}
      ${renderActionButton("create-recycle-bin-cleanup-plan", localize("Create cleanup plan", "创建清理计划"))}
      ${renderActionButton("execute-recycle-bin-cleanup-plan", localize("Permanently clean selected volumes", "永久清理所选卷"), "danger", !plan)}
      ${renderActionButton("open-managed-recycle-bin", localize("Open Windows Recycle Bin", "打开 Windows 回收站"))}
    </div>
    ${state.errors.recycleBin ? `<div class="error-state" data-testid="cleanup-recycle-bin-error">${escapeHtml(state.errors.recycleBin)}</div>` : ""}
    ${state.recycleBinOperationMessage ? `<div class="small-note" data-testid="cleanup-recycle-bin-operation-status">${escapeHtml(state.recycleBinOperationMessage)}</div>` : ""}
    <div class="metrics" data-testid="cleanup-recycle-bin-summary">
      ${renderMetric(localize("Items", "项目数"), report ? report.itemCount : t("state.notChecked"))}
      ${renderMetric(localize("Total size", "总大小"), report ? formatBytes(report.totalBytes) : t("state.notChecked"))}
      ${renderMetric(localize("Recoverable", "可恢复"), report ? report.recoverableCount : t("state.notChecked"))}
      ${renderMetric(localize("Scanned at", "扫描时间"), report ? formatGeneratedAt(report.generatedAt) : t("state.notChecked"))}
    </div>
    <div data-testid="cleanup-recycle-bin-volume-scope">
      ${report ? renderRecycleBinVolumes(report.volumes, selected) : renderEmptyState(localize("Recycle Bin not inspected", "尚未检查回收站"), localize("Refresh the read-only preview before selecting cleanup scope.", "请先刷新只读预览，再选择清理范围。"))}
    </div>
    <div data-testid="cleanup-recycle-bin-preview">
      ${report ? report.items.length ? renderRecycleBinItems(report.items) : renderEmptyState(localize("Recycle Bin is empty", "回收站为空"), localize("No items are available to preview or clean for the current user.", "当前用户没有可预览或清理的回收站项目。")) : ""}
    </div>
    ${report?.warnings.length ? `<div class="small-note"><strong>${localize("Inspection notes", "检查说明")}</strong><ul>${report.warnings.map((warning) => `<li>${escapeHtml(recycleBinWarning(warning))}</li>`).join("")}</ul></div>` : ""}
    <div data-testid="cleanup-recycle-bin-plan-preview">
      ${plan ? `<dl class="kv-list">
        <div><dt>${localize("Plan ID", "计划 ID")}</dt><dd>${escapeHtml(plan.planId)}</dd></div>
        <div><dt>${localize("Selected volumes", "所选卷")}</dt><dd>${escapeHtml(plan.selectedDrives.join(", "))}</dd></div>
        <div><dt>${localize("Snapshot items", "快照项目")}</dt><dd>${plan.itemCount}</dd></div>
        <div><dt>${localize("Estimated bytes", "预计大小")}</dt><dd>${formatBytes(plan.estimatedBytes)}</dd></div>
        <div><dt>${localize("Risk", "风险")}</dt><dd>${localize("Critical - permanent removal", "严重 - 永久移除")}</dd></div>
        <div><dt>${localize("Snapshot fingerprint", "快照指纹")}</dt><dd class="hash-cell">${escapeHtml(plan.snapshotFingerprint)}</dd></div>
      </dl>${renderStringList(localize("Warnings", "警告"), plan.warnings.map(recycleBinWarning))}` : renderEmptyState(localize("No cleanup plan", "尚无清理计划"), localize("Select one or more source volumes and create a snapshot preview before execution.", "请选择一个或多个来源卷，并在执行前创建快照预览。"))}
    </div>
    <div data-testid="cleanup-recycle-bin-result">
      ${result ? `<div class="cleanup-result ${result.success ? "ok" : "warn"}"><div class="metrics">
        ${renderMetric(localize("Verified", "已验证"), result.success ? t("state.yes") : t("state.no"))}
        ${renderMetric(localize("Removed items", "已移除项目"), result.cleanedItems)}
        ${renderMetric(localize("Removed bytes", "已移除大小"), formatBytes(result.cleanedBytes))}
        ${renderMetric(localize("Remaining in scope", "范围内剩余"), result.afterItemCount)}
      </div>${result.failures.length ? renderStringList(localize("Failures", "失败原因"), result.failures) : `<p class="small-note">${localize("Cleanup was verified by a fresh Recycle Bin scan.", "已通过重新扫描回收站验证清理结果。")}</p>`}</div>` : renderEmptyState(localize("No cleanup result", "尚无清理结果"), localize("Execution and post-cleanup rescan results remain visible here.", "执行结果和清理后重扫结果会持续显示在这里。"))}
    </div>
    <div class="small-note"><strong>${localize("Irreversible boundary", "不可逆边界")}</strong><p>${localize("After a final snapshot recheck, Windows empties each selected source volume as a whole. A detected change rejects the plan, but an item added in the brief interval before the Windows command completes could also be removed. No volume is selected automatically.", "最终重核快照后，Windows 会按卷整体清空所选来源卷。检测到变化时会拒绝计划，但在重核后到 Windows 命令完成前的短暂间隔内新增的项目也可能被移除。系统不会自动勾选任何卷。")}</p></div>
  </section>`;
}

function renderRecycleBinVolumes(
  volumes: RecycleBinVolumeSummary[],
  selected: Set<string>,
): string {
  if (!volumes.length) return renderEmptyState(localize("No source volumes", "没有来源卷"), localize("The Recycle Bin is empty or source volumes could not be resolved.", "回收站为空，或无法解析项目的来源卷。"));
  return `<div class="recycle-bin-volume-grid">${volumes.map((volume) => {
    const selectable = volume.drive !== "unknown";
    return `<label class="recycle-bin-volume-card"><input type="checkbox" data-recycle-bin-drive value="${escapeHtml(volume.drive)}" ${selected.has(volume.drive) ? "checked" : ""} ${selectable ? "" : "disabled"} /><span><strong>${escapeHtml(volume.drive)}</strong><small>${volume.itemCount} ${localize("item(s)", "项")} · ${formatBytes(volume.totalBytes)} · ${volume.recoverableCount} ${localize("recoverable", "可恢复")}</small></span></label>`;
  }).join("")}</div>`;
}

function renderRecycleBinItems(items: RecycleBinItem[]): string {
  return `<div class="table-wrap recycle-bin-table"><table data-testid="cleanup-recycle-bin-table"><thead><tr><th>${localize("Name", "名称")}</th><th>${localize("Original location", "原始位置")}</th><th>${localize("Source volume", "来源卷")}</th><th>${localize("Size", "大小")}</th><th>${localize("Deleted at", "删除时间")}</th><th>${localize("Recoverable", "可恢复")}</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td title="${escapeHtml(item.originalPath)}">${escapeHtml(item.originalPath || localize("Unknown", "未知"))}</td><td>${escapeHtml(item.sourceDrive || localize("Unknown", "未知"))}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.deletedAt || localize("Unknown", "未知"))}</td><td>${item.recoverable ? t("state.yes") : t("state.no")}</td></tr>`).join("")}</tbody></table></div>`;
}

function recycleBinWarning(value: string): string {
  if (value === "permanent-removal") return localize("Cleanup permanently empties the selected volume scope; Windows Restore is no longer available.", "清理会永久清空所选卷范围，之后无法再使用 Windows 还原。")
  if (value === "scope-by-volume") return localize("Windows cleanup operates by source volume, not by individual item; an item added after the final recheck could also be removed.", "Windows 清理按来源卷而不是按单个项目执行；最终重核后新增的项目也可能被移除。")
  if (value === "snapshot-must-match") return localize("Any change detected during the final snapshot recheck invalidates this plan.", "最终重核快照时检测到任何变化都会使本计划失效。")
  if (value === "unresolved-source-drive") return localize("One or more items have an unresolved source volume and cannot be selected for cleanup.", "一个或多个项目无法解析来源卷，不能纳入清理范围。")
  if (value === "unrecoverable-item") return localize("One or more shell items do not expose complete restore metadata.", "一个或多个回收站项目没有提供完整的恢复元数据。")
  return value;
}

function formatGeneratedAt(value: string): string {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toLocaleString() : value;
}

function desktopCandidates(report: FolderUsageReport | null): LargeFileItem[] {
  if (!report) return [];
  const byPath = new Map<string, LargeFileItem>();
  [...report.topFiles, ...report.categories.flatMap((category) => category.details)].forEach((item) => {
    byPath.set(item.path.toLocaleLowerCase(), item);
  });
  return Array.from(byPath.values()).sort((left, right) => right.size - left.size);
}

function desktopCandidateEligibility(item: LargeFileItem): { eligible: boolean; reason: string } {
  if (!item.actionable) return { eligible: false, reason: item.blockedReason || localize("Protected by safety rules", "受安全规则保护") };
  if (!item.exists) return { eligible: false, reason: localize("File no longer exists", "文件已不存在") };
  if (item.fileType === "快捷方式" || /\.(lnk|url)$/i.test(item.path)) {
    return { eligible: false, reason: localize("Shortcut is protected", "快捷方式受保护") };
  }
  const modified = Number(item.modifiedAt || 0) * 1000;
  if (modified !== 0 && Date.now() - modified < 7 * 24 * 60 * 60 * 1000) {
    return { eligible: false, reason: localize("Modified within 7 days", "最近 7 天内修改") };
  }
  return { eligible: true, reason: localize("Eligible after backend revalidation", "可处理，执行前后端会再次校验") };
}

function formatModifiedAt(value?: string | null): string {
  if (!value) return localize("Unknown", "未知");
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toLocaleString();
  return value;
}

function renderDesktopCandidateTable(candidates: LargeFileItem[], selected: Set<string>): string {
  if (!candidates.length) return renderEmptyState(localize("No candidate files", "没有候选文件"), localize("The Desktop is empty or contains only protected items.", "桌面为空或只包含受保护项目。"));
  return `<div class="table-wrap desktop-candidate-table"><table data-testid="cleanup-desktop-candidate-table"><thead><tr><th>${localize("Select", "选择")}</th><th>${localize("File", "文件")}</th><th>${localize("Category", "类别")}</th><th>${localize("Size", "大小")}</th><th>${localize("Modified", "修改时间")}</th><th>${localize("Eligibility", "处理条件")}</th></tr></thead><tbody>${candidates.map((item) => {
    const { eligible, reason } = desktopCandidateEligibility(item);
    return `<tr><td><input type="checkbox" data-desktop-selection value="${escapeHtml(item.path)}" ${selected.has(item.path) ? "checked" : ""} ${eligible ? "" : "disabled"} aria-label="${escapeHtml(item.fileName)}" /></td><td title="${escapeHtml(item.path)}">${escapeHtml(item.fileName)}</td><td>${escapeHtml(localizeCleanupFileType(item.fileType))}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(formatModifiedAt(item.modifiedAt))}</td><td>${renderBadge(reason, eligible ? "success" : "neutral")}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function localizeCleanupFileType(value: string): string {
  const labels: Record<string, readonly [string, string]> = {
    "安装包": ["Installer", "安装包"],
    "压缩包": ["Archive", "压缩包"],
    "视频": ["Video", "视频"],
    "图片": ["Image", "图片"],
    "文档": ["Document", "文档"],
    "ISO/磁盘镜像": ["ISO / disk image", "ISO/磁盘镜像"],
    "快捷方式": ["Shortcut", "快捷方式"],
    "其他": ["Other", "其他"],
  };
  const label = labels[value.trim()];
  return label ? localize(label[0], label[1]) : value;
}

function renderDownloadsArchiveSection(state: CleanupWorkbenchState): string {
  return `<section class="panel" data-testid="cleanup-downloads-archive-section">
    <div class="panel-head"><div><h2>${localize("Downloads rescue archive", "下载目录整理归档")}</h2><p>${localize("Analyze and archive selected Downloads clutter through a token-gated move plan.", "分析下载目录内容，并通过确认令牌保护的移动计划归档所选文件。")}</p></div></div>
    ${renderArchiveTargetPicker(state, "downloads", "cleanup-downloads-target-drive", state.downloadsTargetDrive)}
    <div class="toolbar">
      ${renderActionButton("create-downloads-archive-plan", localize("Create archive plan", "创建归档计划"))}
      ${renderActionButton("execute-downloads-archive-plan", localize("Execute archive plan", "执行归档计划"), "danger")}
    </div>
    ${state.errors.downloadsArchive ? `<p class="error-text" data-testid="cleanup-downloads-archive-error">${escapeHtml(state.errors.downloadsArchive)}</p>` : ""}
    ${state.downloads ? renderFolderArchiveSummary(state.downloads) : renderEmptyState(localize("Folder not analyzed yet", "尚未分析目录"), localize("Refresh C-drive rescue or create an archive plan to analyze this folder.", "刷新 C 盘救援信息或创建归档计划以分析此目录。"))}
    <div data-testid="cleanup-downloads-archive-plan-result">${state.downloadsArchivePlan ? renderArchivePlan(state.downloadsArchivePlan) : renderEmptyState(localize("No archive plan", "尚无归档计划"), localize("Create a plan before executing. High-risk and unsafe items stay skipped.", "执行前请先创建计划；高风险和不安全项目会保持跳过。"))}</div>
    <div data-testid="cleanup-downloads-archive-execute-result">${state.downloadsArchiveResult ? renderMoveResult(state.downloadsArchiveResult) : renderEmptyState(localize("No execution result", "尚无执行结果"), localize("Execution results, skipped items, failures, and report summary appear here.", "执行结果、跳过项目、失败和报告摘要会显示在这里。"))}</div>
    <div data-testid="cleanup-downloads-archive-rollback" class="small-note"><strong>${localize("Recovery", "恢复")}</strong><p>${localize("Use the target folder and report summary to move files back manually, or use matching rollback records when available.", "可根据目标目录和报告摘要手动移回文件；存在匹配回滚记录时也可使用回滚。")}</p></div>
  </section>`;
}

function renderFolderArchiveSummary(report: FolderUsageReport): string {
  return `<div class="metrics">
    ${renderMetric(localize("Files", "文件"), report.fileCount)}
    ${renderMetric(localize("Folders", "文件夹"), report.folderCount)}
    ${renderMetric(localize("Protected/skipped", "受保护/跳过"), report.protectedCount)}
    ${renderMetric(localize("Categories", "类别"), report.categories.length)}
    ${renderMetric(t("feature.cleanup.bytes"), formatBytes(report.totalBytes))}
    ${renderMetric(t("feature.cleanup.path"), report.path)}
  </div>
  ${renderStringList(t("feature.cleanup.warnings"), report.warnings)}
  ${renderStringList(t("feature.cleanup.suggestions"), report.suggestions)}
  ${report.topFiles.length ? `<div class="table-wrap"><table><thead><tr><th>${t("feature.cleanup.file")}</th><th>${t("feature.cleanup.size")}</th><th>${t("feature.cleanup.suggestion")}</th></tr></thead><tbody>${report.topFiles.slice(0, 8).map((item) => `<tr><td title="${escapeHtml(item.path)}">${escapeHtml(item.fileName)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.suggestion)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}

function renderArchivePlan(plan: MovePlan): string {
  return `<div class="cleanup-plan-panel">
    ${renderObjectTable(plan, ["planId", "source", "target", "mode", "estimatedBytes", "itemCount", "risk", "requiresAdmin", "reversible", "warnings"])}
    ${plan.selectedItems?.length ? `<div class="table-wrap"><table><thead><tr><th>${localize("Source", "源文件")}</th><th>${localize("Target", "目标")}</th><th>${localize("Size", "大小")}</th><th>SHA-256</th></tr></thead><tbody>${plan.selectedItems.map((item) => `<tr><td title="${escapeHtml(item.source)}">${escapeHtml(item.source)}</td><td title="${escapeHtml(item.target)}">${escapeHtml(item.target)}</td><td>${formatBytes(item.size)}</td><td class="hash-cell">${escapeHtml(item.sha256)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <p class="small-note"><strong>${localize("Preview required.", "必须先预览。")}</strong> ${localize("Review source, target, skipped items, and warnings before executing.", "执行前请检查来源、目标、跳过项目和警告。")}</p>
  </div>`;
}

function renderMoveResult(result: MoveResult): string {
  return `<div class="cleanup-result ${result.success ? "ok" : "warn"}">
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.resultSuccess"), result.success ? t("state.yes") : t("state.no"))}
      ${renderMetric(t("feature.cleanup.resultCleanedBytes"), formatBytes(result.movedBytes))}
      ${renderMetric(t("feature.cleanup.resultCleaned"), result.movedItems)}
      ${renderMetric(localize("Target", "目标"), result.targetPath)}
    </div>
    ${renderObjectTable(result, ["planId", "sourceBackup", "targetPath", "junctionCreated", "rollbackId"])}
    ${result.receipts?.length ? `<div class="table-wrap"><table><thead><tr><th>${localize("Source", "源文件")}</th><th>${localize("Verified target", "已验证目标")}</th><th>${localize("Size", "大小")}</th><th>SHA-256</th></tr></thead><tbody>${result.receipts.map((receipt) => `<tr><td>${escapeHtml(receipt.source)}</td><td>${escapeHtml(receipt.target)}</td><td>${formatBytes(receipt.size)}</td><td class="hash-cell">${escapeHtml(receipt.targetSha256)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${result.failures.length ? `<div class="small-note"><strong>${t("feature.cleanup.resultFailures")}</strong><ul>${result.failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join("")}</ul></div>` : `<p class="small-note">${t("feature.cleanup.resultNoFailures")}</p>`}
    ${result.reportMarkdown ? `<details class="small-note"><summary>${t("feature.cleanup.resultReport")}</summary><pre>${escapeHtml(result.reportMarkdown)}</pre></details>` : ""}
  </div>`;
}

function renderPartition(partition: CleanupWorkbenchState["partition"]): string {
  if (!partition) return "";
  const tone = partition.canExtendSafely ? "success" : partition.resultLevel === "blocked" ? "danger" : "warning";
  return `<div class="cleanup-result ${partition.canExtendSafely ? "ok" : "warn"}">
    <div class="panel-head"><div><h3>${t("feature.cleanup.partition")}</h3><p>${escapeHtml(partition.explanation)}</p></div>${renderBadge(partition.resultLevel, tone)}</div>
    <div class="metrics">
      ${renderMetric("C:", formatBytes(partition.cPartition.size), partition.cPartition.fileSystem ?? "")}
      ${renderMetric(t("feature.cleanup.unallocatedAfterC"), formatBytes(partition.unallocatedAfterC ?? 0))}
      ${renderMetric(t("feature.cleanup.recoveryBlocks"), partition.recoveryPartitionBlocks ? t("state.yes") : t("state.no"))}
      ${renderMetric(t("feature.cleanup.canExtend"), partition.canExtendSafely ? t("state.yes") : t("state.no"))}
    </div>
    ${renderStringList(t("feature.cleanup.suggestedActions"), partition.suggestedActions)}
  </div>`;
}

function renderCleanupReport(state: CleanupWorkbenchState): string {
  if (!state.scan) {
    return `<section class="panel"><h2>${t("feature.cleanup.report")}</h2>${renderEmptyState(t("feature.cleanup.noScan"), t("feature.cleanup.noScanDetail"))}</section>`;
  }
  const candidates = state.scan.categories.flatMap((category) => category.items);
  const selected = selectedCleanableCandidates(state);
  return `<section class="panel">
    <h2>${t("feature.cleanup.report")}</h2>
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.scanned"), state.scan.totalItems)}
      ${renderMetric(t("feature.cleanup.bytes"), formatBytes(state.scan.totalBytes))}
      ${renderMetric(t("feature.cleanup.selected"), selected.length)}
      ${renderMetric(t("feature.cleanup.selectedBytes"), formatBytes(sumBytes(selected)))}
      ${renderMetric(t("feature.cleanup.generatedAt"), state.scan.generatedAt)}
    </div>
    ${renderStringList(t("feature.cleanup.warnings"), state.scan.warnings)}
    <div class="cleanup-summary">${state.scan.categories.map((category) => `<div><strong>${escapeHtml(category.name)}</strong><span>${formatBytes(category.totalBytes)} / ${category.itemCount}</span><small>${escapeHtml(category.description)}</small></div>`).join("")}</div>
    ${renderCandidates(state, candidates)}
  </section>`;
}

function renderCandidates(state: CleanupWorkbenchState, items: CleanupCandidate[]): string {
  if (!items.length) return renderEmptyState(t("feature.cleanup.noSelectedCandidates"), t("feature.cleanup.noSelectedCandidatesDetail"));
  return `<div class="table-wrap"><table><thead><tr><th>${t("feature.cleanup.selected")}</th><th>${t("feature.cleanup.path")}</th><th>${t("feature.cleanup.size")}</th><th>${t("feature.cleanup.reason")}</th><th>${t("feature.cleanup.risk")}</th></tr></thead><tbody>${items
    .slice(0, 50)
    .map((item) => {
      const selected = state.selectedIds.includes(item.id);
      const disabled = !item.cleanable;
      const reason = item.skippedReason || item.reason;
      return `<tr><td><input type="checkbox" data-cleanup-candidate="${escapeHtml(item.id)}" ${selected && !disabled ? "checked" : ""} ${disabled ? "disabled" : ""} aria-label="${escapeHtml(item.path)}" /></td><td title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(reason)}</td><td>${disabled ? renderBadge(t("feature.cleanup.notAllowed"), "danger") : renderBadge(t("feature.cleanup.planExecutable"), "success")} ${escapeHtml(item.risk)}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function renderCleanupPlan(state: CleanupWorkbenchState): string {
  if (!state.plan) {
    return `<div class="empty">${t("feature.cleanup.noPlan")}</div>${renderSkippedCleanupItems(state)}`;
  }
  return `<div class="cleanup-plan-panel">
    ${renderObjectTable(state.plan, ["planId", "estimatedBytes", "requiresAdmin", "riskSummary", "warnings"])}
    <h3>${t("feature.cleanup.planExecutableItems")}</h3>
    <div class="table-wrap"><table><thead><tr><th>${t("feature.cleanup.path")}</th><th>${t("feature.cleanup.size")}</th><th>${t("feature.cleanup.action")}</th><th>${t("feature.cleanup.risk")}</th><th>${t("feature.cleanup.reversible")}</th></tr></thead><tbody>${state.plan.selectedItems
      .map((item) => `<tr><td title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.risk)}</td><td>${item.reversible ? t("state.yes") : t("state.no")}</td></tr>`)
      .join("")}</tbody></table></div>
    ${renderSkippedCleanupItems(state)}
  </div>`;
}

function renderSkippedCleanupItems(state: CleanupWorkbenchState): string {
  const skipped = state.scan?.categories.flatMap((category) => category.items.filter((item) => !item.cleanable).map((item) => ({ ...item, categoryName: category.name }))) ?? [];
  if (!skipped.length) return "";
  return `<div class="small-note">
    <strong>${t("feature.cleanup.planSkippedItems")}</strong>
    <div class="table-wrap"><table><thead><tr><th>${t("feature.cleanup.path")}</th><th>${t("feature.cleanup.reason")}</th><th>${t("feature.cleanup.risk")}</th></tr></thead><tbody>${skipped
      .slice(0, 20)
      .map((item) => `<tr><td title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</td><td>${escapeHtml(item.skippedReason || item.reason || item.categoryName)}</td><td>${renderBadge(t("feature.cleanup.notAllowed"), "danger")} ${escapeHtml(item.risk)}</td></tr>`)
      .join("")}</tbody></table></div>
  </div>`;
}

function renderCleanupExecutionResult(state: CleanupWorkbenchState): string {
  const result = state.cleanupResult;
  if (!result) return "";
  return `<div class="cleanup-result ${result.success ? "ok" : "warn"}" data-testid="cleanup-operation-result">
    <h3>${t("feature.cleanup.executionResult")}</h3>
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.resultSuccess"), result.success ? t("state.yes") : t("state.no"))}
      ${renderMetric(t("feature.cleanup.resultCleanedBytes"), formatBytes(result.cleanedBytes))}
      ${renderMetric(t("feature.cleanup.resultCleaned"), result.cleanedItems)}
      ${renderMetric(t("feature.cleanup.resultSkipped"), result.skippedItems)}
      ${renderMetric(t("feature.cleanup.resultFailed"), result.failedItems)}
    </div>
    ${renderObjectTable(result, ["planId", "startedAt", "finishedAt"])}
    ${result.failures.length ? `<div class="small-note"><strong>${t("feature.cleanup.resultFailures")}</strong><ul>${result.failures.map((failure) => `<li>${escapeHtml(failure.path)} - ${escapeHtml(failure.reason)}</li>`).join("")}</ul></div>` : `<p class="small-note">${t("feature.cleanup.resultNoFailures")}</p>`}
    ${result.reportMarkdown ? `<details class="small-note"><summary>${t("feature.cleanup.resultReport")}</summary><pre>${escapeHtml(result.reportMarkdown)}</pre></details>` : ""}
  </div>`;
}

function renderLargeFiles(state: CleanupWorkbenchState): string {
  const paged = pageItems(state.largeFiles, state.largeFilesPage);
  return `<section class="panel" id="cleanup-large-files">
    <div class="panel-head"><div><h2>${t("feature.cleanup.largeFiles")}</h2><p>${t("feature.cleanup.largeFilesDetail")}</p></div></div>
    ${state.errors.largeFiles ? `<p class="error-text">${escapeHtml(state.errors.largeFiles)}</p>` : ""}
    ${state.largeFiles.length ? `<div class="table-wrap"><table><thead><tr><th>${t("feature.cleanup.file")}</th><th>${t("feature.cleanup.size")}</th><th>${t("feature.cleanup.suggestion")}</th><th>${t("feature.cleanup.risk")}</th><th>${t("feature.cleanup.actions")}</th></tr></thead><tbody>${paged.items
      .map((item: LargeFileItem) => `<tr><td title="${escapeHtml(item.path)}">${escapeHtml(item.fileName)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.suggestion)}</td><td>${escapeHtml(item.risk)}</td><td><button data-large-file-open="${escapeHtml(item.path)}" type="button">${t("feature.cleanup.openLocation")}</button><button data-large-file-copy="${escapeHtml(item.path)}" type="button">${t("feature.runtimes.copyPath")}</button></td></tr>`)
      .join("")}</tbody></table></div>${renderPagination("cleanup-large-files", paged.page, paged.totalPages, paged.total)}` : renderEmptyState(t("feature.cleanup.largeFilesNotScanned"), t("feature.cleanup.largeFilesNotScannedDetail"))}
  </section>`;
}

function renderVolumes(volumes: DiskVolumeInfo[]): string {
  if (!volumes?.length) return "";
  return `<div class="cleanup-volume-grid" data-testid="cleanup-disk-card-grid">${volumes.map((volume) => `<article class="maintenance-metric disk-volume-card risk-${escapeHtml(volume.risk)}" data-testid="cleanup-disk-card">
    <div class="disk-volume-heading"><strong>${escapeHtml(volume.drive)}</strong>${renderBadge(diskRiskLabel(volume.risk), diskRiskTone(volume.risk))}</div>
    <span>${formatBytes(volume.freeBytes)} ${localize("free", "可用")} / ${formatBytes(volume.totalBytes)} ${localize("total", "总计")}</span>
    <small>${escapeHtml(volume.fileSystem ?? localize("Unknown file system", "未知文件系统"))} · ${volume.usedPercent.toFixed(1)}% ${localize("used", "已使用")}</small>
    <small>${localize("Archive target", "归档目标")}: ${escapeHtml(archiveTargetReasonLabel(volume))}</small>
    <div class="row-actions compact"><button data-disk-open="${escapeHtml(volume.drive)}" type="button">${t("feature.cleanup.openLocation")}</button><button data-disk-copy="${escapeHtml(diskSummary(volume))}" type="button">${t("feature.runtimes.copyPath")}</button></div>
  </article>`).join("")}</div>`;
}

function renderArchiveTargetPicker(
  state: CleanupWorkbenchState,
  kind: "generic" | "desktop" | "downloads",
  selectId: string,
  selectedTarget: string,
): string {
  const selectors = archiveTargetSelectors[kind];
  const targets = eligibleArchiveTargets(state.diskOverview);
  const selectedVolume = targets.find((volume) => targetMatchesVolume(selectedTarget, volume));
  const selectedIsVolumeRoot = Boolean(selectedVolume && isDriveRootSelection(selectedTarget));
  const selectedIsFolder = Boolean(selectedTarget && !selectedIsVolumeRoot);
  const options = targets.map((volume, index) => {
    const value = volume.drive.replace(/[\\/]+$/, "");
    const label = `${value} - ${formatBytes(volume.freeBytes)} ${localize("free", "可用")}${index === 0 ? ` - ${localize("recommended", "推荐")}` : ""}`;
    return `<option value="${escapeHtml(value)}" ${selectedIsVolumeRoot && targetMatchesVolume(selectedTarget, volume) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  });
  if (selectedIsFolder) {
    options.unshift(`<option value="${escapeHtml(selectedTarget)}" selected>${escapeHtml(selectedTarget)} - ${localize("chosen folder", "已选目录")}</option>`);
  }
  if (!options.length) {
    options.push(`<option value="">${localize("No eligible non-system target detected", "未检测到符合条件的非系统盘目标")}</option>`);
  }
  const detail = selectedIsFolder && selectedVolume
    ? `${selectedTarget} · ${selectedVolume.drive} · ${formatBytes(selectedVolume.freeBytes)} ${localize("free", "可用")}`
    : selectedVolume
      ? `${selectedVolume.drive} · ${formatBytes(selectedVolume.freeBytes)} ${localize("free", "可用")} · ${selectedVolume.fileSystem || localize("unknown file system", "未知文件系统")}`
    : selectedTarget || localize("Choose an eligible drive or directory", "请选择符合条件的目标盘或目录");
  return `<div class="archive-target-picker" data-testid="${selectors.picker}">
    <label>${localize("Archive target", "归档目标")}<select id="${selectId}" data-testid="${selectors.select}">${options.join("")}</select></label>
    <div class="toolbar">
      ${renderActionButton(selectors.recommendedAction, localize("Use recommended", "使用推荐目标"))}
      ${renderActionButton(selectors.chooseAction, localize("Choose target folder", "选择目标目录"))}
    </div>
    <small>${escapeHtml(detail)}</small>
  </div>`;
}

function archiveTargetReasonLabel(volume: DiskVolumeInfo): string {
  if (volume.archiveTargetReason === "eligible") return localize("Eligible", "可用");
  if (volume.archiveTargetReason === "system-volume") return localize("System volume excluded", "系统卷已排除");
  if (volume.archiveTargetReason === "read-only") return localize("Read-only volume excluded", "只读卷已排除");
  if (volume.archiveTargetReason === "removable") return localize("Removable volume excluded", "可移动卷已排除");
  if (volume.archiveTargetReason === "insufficient-space") return localize("Insufficient free space", "可用空间不足");
  return localize("Unsupported mount", "不支持的挂载点");
}

function diskRiskLabel(risk: string): string {
  const normalized = risk.toLowerCase();
  if (normalized === "critical") return localize("Danger", "危险");
  if (normalized === "high") return localize("High usage", "高占用");
  if (normalized === "medium") return localize("Medium usage", "中等占用");
  return localize("Low usage", "低占用");
}

function diskRiskTone(risk: string): "success" | "warning" | "danger" {
  const normalized = risk.toLowerCase();
  if (normalized === "critical") return "danger";
  if (normalized === "high" || normalized === "medium") return "warning";
  return "success";
}

function diskSummary(volume: DiskVolumeInfo): string {
  return `${volume.drive} ${formatBytes(volume.freeBytes)} free / ${formatBytes(volume.totalBytes)} total, ${volume.usedPercent.toFixed(1)}% used, ${volume.fileSystem ?? ""}, risk=${volume.risk}`;
}

function renderFolderOverview(label: string, report: FolderUsageReport | null): string {
  if (!report) return `<div class="folder-overview"><strong>${escapeHtml(label)}</strong><small>${t("state.notChecked")}</small></div>`;
  return `<div class="folder-overview">
    <strong>${escapeHtml(label)}</strong>
    <span>${formatBytes(report.totalBytes)}</span>
    <small title="${escapeHtml(report.path)}">${escapeHtml(report.path)}</small>
    ${renderStringList(t("feature.cleanup.suggestions"), report.suggestions.slice(0, 3))}
  </div>`;
}

function renderStringList(title: string, items: string[]): string {
  if (!items.length) return "";
  return `<div class="small-note"><strong>${escapeHtml(title)}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function selectedCleanableCandidates(state: CleanupWorkbenchState): CleanupCandidate[] {
  const selected = new Set(state.selectedIds);
  return state.scan?.categories.flatMap((category) => category.items.filter((item) => item.cleanable && selected.has(item.id))) ?? [];
}

function sumBytes(items: CleanupCandidate[]): number {
  return items.reduce((total, item) => total + item.size, 0);
}
