import { formatBytes } from "../../core/format";
import type { CleanupCandidate, DiskVolumeInfo, DuplicateGroup, FolderUsageReport, LargeFileItem, MovePlan, MoveResult } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderEmptyState, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { CleanupWorkbenchState } from "./state";

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
      <input id="cleanup-archive-target-drive" value="${escapeHtml(state.archiveTargetDrive)}" placeholder="${localize("Target drive, for example D", "目标驱动器，例如 D")}" />
    </div>
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
  return `<section class="panel" data-testid="cleanup-desktop-archive-section">
    <div class="panel-head"><div><h2>${localize("Desktop rescue archive", "桌面整理归档")}</h2><p>${localize("Analyze and archive selected desktop clutter through a token-gated move plan.", "分析桌面内容，并通过确认令牌保护的移动计划归档所选文件。")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("create-desktop-archive-plan", localize("Create archive plan", "创建归档计划"))}
      ${renderActionButton("execute-desktop-archive-plan", localize("Execute archive plan", "执行归档计划"), "danger")}
    </div>
    ${state.errors.desktopArchive ? `<p class="error-text" data-testid="cleanup-desktop-archive-error">${escapeHtml(state.errors.desktopArchive)}</p>` : ""}
    ${state.desktop ? renderFolderArchiveSummary(state.desktop) : renderEmptyState(localize("Folder not analyzed yet", "尚未分析目录"), localize("Refresh C-drive rescue or create an archive plan to analyze this folder.", "刷新 C 盘救援信息或创建归档计划以分析此目录。"))}
    <div data-testid="cleanup-desktop-archive-plan-result">${state.desktopArchivePlan ? renderArchivePlan(state.desktopArchivePlan) : renderEmptyState(localize("No archive plan", "尚无归档计划"), localize("Create a plan before executing. High-risk and unsafe items stay skipped.", "执行前请先创建计划；高风险和不安全项目会保持跳过。"))}</div>
    <div data-testid="cleanup-desktop-archive-execute-result">${state.desktopArchiveResult ? renderMoveResult(state.desktopArchiveResult) : renderEmptyState(localize("No execution result", "尚无执行结果"), localize("Execution results, skipped items, failures, and report summary appear here.", "执行结果、跳过项目、失败和报告摘要会显示在这里。"))}</div>
    <div data-testid="cleanup-desktop-archive-rollback" class="small-note"><strong>${localize("Recovery", "恢复")}</strong><p>${localize("Use the target folder and report summary to move files back manually, or use matching rollback records when available.", "可根据目标目录和报告摘要手动移回文件；存在匹配回滚记录时也可使用回滚。")}</p></div>
  </section>`;
}

function renderDownloadsArchiveSection(state: CleanupWorkbenchState): string {
  return `<section class="panel" data-testid="cleanup-downloads-archive-section">
    <div class="panel-head"><div><h2>${localize("Downloads rescue archive", "下载目录整理归档")}</h2><p>${localize("Analyze and archive selected Downloads clutter through a token-gated move plan.", "分析下载目录内容，并通过确认令牌保护的移动计划归档所选文件。")}</p></div></div>
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
    ${renderMetric(localize("Files/categories", "文件/类别"), report.categories.length)}
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
  return `<div class="cleanup-volume-grid">${volumes.map((volume) => `<article class="maintenance-metric risk-${escapeHtml(volume.risk)}">
    <strong>${escapeHtml(volume.drive)}</strong>
    <span>${formatBytes(volume.freeBytes)} / ${formatBytes(volume.totalBytes)}</span>
    <small>${escapeHtml(volume.fileSystem ?? "")} - ${volume.usedPercent.toFixed(1)}% - ${escapeHtml(volume.risk)}</small>
    <div class="row-actions compact"><button data-disk-open="${escapeHtml(volume.drive)}" type="button">${t("feature.cleanup.openLocation")}</button><button data-disk-copy="${escapeHtml(diskSummary(volume))}" type="button">${t("feature.runtimes.copyPath")}</button></div>
  </article>`).join("")}</div>`;
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
