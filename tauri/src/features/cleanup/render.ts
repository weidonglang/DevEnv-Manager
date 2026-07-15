import { formatBytes } from "../../core/format";
import type { CleanupCandidate, DiskVolumeInfo, DuplicateGroup, FolderUsageReport, LargeFileItem, MovePlan, MoveResult } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderEmptyState, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
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
          ${renderActionButton("create-expansion-plan", t("feature.cleanup.expansion"))}
          ${renderActionButton("execute-expansion-plan", t("feature.cleanup.executeExpansion"), "danger")}
        </div>
        ${state.errors.createPlan ? `<div class="error-state" data-testid="cleanup-inline-error">${escapeHtml(state.errors.createPlan)}</div>` : ""}
        <div class="form-grid environment-plan-input">
          <input id="cleanup-move-source" value="${escapeHtml(state.moveSource)}" placeholder="${t("feature.cleanup.moveSource")}" />
          <input id="cleanup-move-target-drive" value="${escapeHtml(state.moveTargetDrive)}" placeholder="${t("feature.cleanup.moveTargetDrive")}" />
          <select id="cleanup-move-mode">
            <option value="archive" ${state.moveMode === "archive" ? "selected" : ""}>${t("feature.cleanup.moveModeArchive")}</option>
            <option value="junction" ${state.moveMode === "junction" ? "selected" : ""}>${t("feature.cleanup.moveModeJunction")}</option>
          </select>
          ${renderActionButton("choose-cleanup-move-source", t("feature.cleanup.chooseMoveSource"))}
          <label>Partition expansion backup receipt<input id="cleanup-expansion-backup-receipt" data-testid="cleanup-expansion-backup-receipt" value="${escapeHtml(state.expansionBackupReceipt)}" placeholder="External system backup receipt required" /></label>
        </div>
      </section>
      ${renderCDriveRescue(state)}
      ${renderApplicationUsage(state)}
      ${renderGenericArchive(state)}
      ${renderDuplicateFiles(state)}
      ${renderDesktopArchiveSection(state)}
      ${renderDownloadsArchiveSection(state)}
      ${renderCleanupReport(state)}
      ${renderLargeFiles(state)}
      <section class="panel"><h2>${t("feature.cleanup.plans")}</h2>${renderCleanupPlan(state)}${renderCleanupExecutionResult(state)}${state.moveOperationResult ? `<div class="small-note" data-testid="cleanup-move-operation-result">${escapeHtml(state.moveOperationResult)}</div>` : ""}${state.movePlan ? renderObjectTable(state.movePlan, ["planId", "source", "target", "mode", "warnings"]) : ""}${state.expansionPlan ? renderObjectTable(state.expansionPlan, ["planId", "mode", "canExecute", "requiresAdmin", "estimatedAddedBytes", "backupRequired", "explanation"]) : ""}${state.expansionResult ? renderObjectTable(state.expansionResult, ["planId", "success", "beforeFree", "afterFree", "output"]) : ""}</section>
    </div>
  `;
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
    <div class="panel-head"><div><h2>Application storage usage</h2><p>Read-only estimates from known application data locations and Windows uninstall metadata. This never uninstalls applications or deletes install directories.</p></div></div>
    <div class="toolbar">${renderActionButton("inspect-application-usage", "Scan application usage", "primary")}</div>
    ${state.errors.appUsage ? `<div class="error-state" data-testid="cleanup-application-usage-error">${escapeHtml(state.errors.appUsage)}</div>` : ""}
    <div data-testid="cleanup-application-usage-result">
      ${report ? `<div class="table-wrap"><table><thead><tr><th>Application</th><th>Path</th><th>Estimated size</th><th>Evidence</th><th>Access</th></tr></thead><tbody>
        ${appItems.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.path || "Not detected")}</td><td>${formatBytes(item.size)}</td><td>Known application data location${item.warnings.length ? `; ${escapeHtml(item.warnings.join("; "))}` : ""}</td><td>${item.path ? `<button data-app-usage-open="${escapeHtml(item.path)}" type="button">Open location</button>` : "Not available"}</td></tr>`).join("")}
        ${report.installedSoftware.map((item) => `<tr><td>${escapeHtml(item.name)}${item.publisher ? ` - ${escapeHtml(item.publisher)}` : ""}</td><td>${escapeHtml(item.installLocation || "Not reported")}</td><td>${formatBytes(item.estimatedSize)}</td><td>Windows uninstall registry; ${escapeHtml(item.suggestion)}</td><td>${item.installLocation ? `<button data-app-usage-open="${escapeHtml(item.installLocation)}" type="button">Open location</button>` : "Location unavailable"}</td></tr>`).join("")}
      </tbody></table></div>` : renderEmptyState("Application usage not scanned", "Run the read-only scan to list detected application and installed-software evidence.")}
    </div>
    <div class="small-note"><strong>Protected boundary</strong><p>System applications, browser credentials, chat databases, and protected paths are reported only at a safe summary level. Use Windows Apps & Features for uninstall decisions.</p></div>
  </section>`;
}

function renderGenericArchive(state: CleanupWorkbenchState): string {
  const plan = state.archivePlan;
  const result = state.archiveResult;
  return `<section class="panel" data-testid="cleanup-generic-archive-section">
    <div class="panel-head"><div><h2>Selected-file archive plan</h2><p>Add allowed regular files, preview source-to-target mappings and conflicts, then confirm execution. Desktop and Downloads bulk archive plans remain separate.</p></div></div>
    <div class="form-grid">
      <input id="cleanup-archive-source" value="${escapeHtml(state.archiveSource)}" readonly placeholder="Choose an allowed file" />
      <input id="cleanup-archive-source-label" value="${escapeHtml(state.archiveSourceLabel)}" placeholder="Evidence/source label" />
      <input id="cleanup-archive-target-drive" value="${escapeHtml(state.archiveTargetDrive)}" placeholder="Target drive, for example D" />
    </div>
    <div class="toolbar">
      ${renderActionButton("choose-archive-file", "Choose file")}
      ${renderActionButton("add-archive-plan-item", "Add to archive list")}
      ${renderActionButton("refresh-archive-plan-items", "Refresh list")}
      ${renderActionButton("create-generic-archive-plan", "Create execution preview", "primary")}
      ${renderActionButton("execute-generic-archive-plan", "Execute selected-file archive", "danger")}
    </div>
    ${state.errors.archive ? `<div class="error-state" data-testid="cleanup-generic-archive-error">${escapeHtml(state.errors.archive)}</div>` : ""}
    <div data-testid="cleanup-generic-archive-items">${state.archiveItems.length ? `<div class="table-wrap"><table><thead><tr><th>Source</th><th>Size</th><th>Evidence</th><th>Added</th><th>Action</th></tr></thead><tbody>${state.archiveItems.map((item) => `<tr><td>${escapeHtml(item.path)}</td><td>${formatBytes(item.size)}</td><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.addedAt)}</td><td><button data-archive-remove="${escapeHtml(item.id)}" type="button">Remove</button></td></tr>`).join("")}</tbody></table></div>` : renderEmptyState("Archive list is empty", "Choose an allowed regular file and add it to the list.")}</div>
    <div data-testid="cleanup-generic-archive-plan-preview">${plan ? `<dl class="kv-list">
      <div><dt>Plan ID</dt><dd>${escapeHtml(plan.planId)}</dd></div>
      <div><dt>Target root</dt><dd>${escapeHtml(plan.targetRoot)}</dd></div>
      <div><dt>Estimated bytes</dt><dd>${formatBytes(plan.estimatedBytes)}</dd></div>
      <div><dt>Risk</dt><dd>${escapeHtml(plan.riskLevel)}</dd></div>
      ${plan.entries.map((entry) => `<div><dt>${escapeHtml(entry.source)}</dt><dd>${escapeHtml(entry.target)} - SHA-256 ${escapeHtml(entry.sha256)}${entry.conflict ? ` - CONFLICT: ${escapeHtml(entry.conflictReason)}` : " - ready"}</dd></div>`).join("")}
      <div><dt>Warnings</dt><dd>${escapeHtml(plan.warnings.join("; "))}</dd></div>
    </dl>` : renderEmptyState("No execution preview", "Create a plan to validate paths, target conflicts, and estimated size.")}</div>
    <div data-testid="cleanup-generic-archive-result">${result ? `<dl class="kv-list">
      <div><dt>Status</dt><dd>${result.success ? "Verified" : "Completed with failures"}</dd></div>
      <div><dt>Moved</dt><dd>${result.movedItems} item(s), ${formatBytes(result.movedBytes)}</dd></div>
      <div><dt>Skipped</dt><dd>${result.skippedItems}</dd></div>
      <div><dt>Verified targets</dt><dd>${escapeHtml(result.verifiedTargets.join("; ") || "none")}</dd></div>
      <div><dt>Failures</dt><dd>${escapeHtml(result.failures.join("; ") || "none")}</dd></div>
      <div><dt>Receipt</dt><dd>${escapeHtml(result.receiptPath)}</dd></div>
      <div><dt>Rollback guidance</dt><dd>${escapeHtml(result.rollbackGuidance.join("; ") || "No files moved")}</dd></div>
    </dl>` : renderEmptyState("No archive execution result", "Execution verification and rollback guidance appear here.")}</div>
  </section>`;
}

function renderCDriveRescue(state: CleanupWorkbenchState): string {
  const overview = state.overview;
  const partition = state.partition;
  const diskOverview = state.diskOverview.length ? state.diskOverview : overview?.volumes ?? [];
  return `<section class="panel" data-testid="cleanup-disk-overview-entry">
    <div class="panel-head"><div><h2>${t("feature.cleanup.cRescue")}</h2><p>${t("feature.cleanup.cRescueDetail")}</p></div></div>
    <div class="toolbar">${renderActionButton("inspect-disk-overview", "Refresh disk overview")}${renderActionButton("inspect-c-drive-rescue", t("feature.cleanup.cRescue"), "primary")}</div>
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
    <div class="panel-head"><div><h2>Duplicate large files</h2><p>Read-only duplicate scan. It does not delete files.</p></div></div>
    <div class="form-grid">
      <input id="cleanup-duplicate-scan-root" data-testid="cleanup-duplicate-scan-root" value="${escapeHtml(state.duplicateScanRoot)}" placeholder="Scan folder (blank uses Downloads)" />
      <input id="cleanup-duplicate-min-size" data-testid="cleanup-duplicate-min-size" type="number" min="1" step="1" value="${state.duplicateScanMinSizeMb}" aria-label="Minimum duplicate file size in MB" />
    </div>
    <div class="toolbar">${renderActionButton("scan-duplicate-large-files", "Scan duplicate large files")}</div>
    ${state.errors.duplicateFiles ? `<p class="error-text" data-testid="cleanup-duplicate-large-files-error">${escapeHtml(state.errors.duplicateFiles)}</p>` : ""}
    ${renderDuplicateScanStatus(state)}
    <div data-testid="cleanup-duplicate-large-files-result">
      ${state.duplicateScanStatus === "completedWithResults" ? `<div class="table-wrap"><table><thead><tr><th>Hash</th><th>Size</th><th>Files</th><th>Reclaimable</th><th>Evidence</th></tr></thead><tbody>${paged.items.map(renderDuplicateGroup).join("")}</tbody></table></div>${renderPagination("cleanup-duplicate-large-files", paged.page, paged.totalPages, paged.total)}` : state.duplicateScanStatus === "completedEmpty" ? `<div data-testid="cleanup-duplicate-large-files-scan-result">${renderEmptyState(t("feature.cleanup.noDuplicateGroups"), t("feature.cleanup.duplicateScanCompleteEmptyDetail"))}</div>` : state.duplicateScanStatus === "running" ? `<div class="loading-state" role="status">Scanning duplicate files...</div>` : state.duplicateScanStatus === "failed" ? renderEmptyState("Duplicate scan failed", "Review the persistent error above, adjust the folder, and retry.") : renderEmptyState("No duplicate scan yet", "Run the read-only scan to list duplicate groups.")}
    </div>
  </section>`;
}

function renderDuplicateScanStatus(state: CleanupWorkbenchState): string {
  if (state.duplicateScanStatus === "notStarted") return "";
  const status = state.duplicateScanStatus === "running"
    ? "Scanning"
    : state.duplicateScanStatus === "completedWithResults"
      ? `Completed with ${state.duplicateGroups.length} duplicate group(s)`
      : state.duplicateScanStatus === "completedEmpty"
        ? "Scan complete - no duplicate groups found"
        : "Scan failed";
  const root = state.duplicateScanRoot || "Downloads (automatic safe default)";
  const elapsed = state.duplicateScanElapsedMs ? `${state.duplicateScanElapsedMs} ms` : "In progress";
  return `<dl class="kv-list" data-testid="cleanup-duplicate-scan-status">
    <div><dt>Status</dt><dd>${escapeHtml(status)}</dd></div>
    <div><dt>Scan folder</dt><dd>${escapeHtml(root)}</dd></div>
    <div><dt>Minimum size</dt><dd>${state.duplicateScanMinSizeMb} MB</dd></div>
    <div><dt>Duration</dt><dd>${escapeHtml(elapsed)}</dd></div>
    ${state.duplicateScanCompletedAt ? `<div><dt>Completed at</dt><dd>${escapeHtml(state.duplicateScanCompletedAt)}</dd></div>` : ""}
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
    <div class="panel-head"><div><h2>Desktop rescue archive</h2><p>Analyze and archive selected desktop clutter through a token-gated move plan.</p></div></div>
    <div class="toolbar">
      ${renderActionButton("create-desktop-archive-plan", "Create archive plan")}
      ${renderActionButton("execute-desktop-archive-plan", "Execute archive plan", "danger")}
    </div>
    ${state.errors.desktopArchive ? `<p class="error-text" data-testid="cleanup-desktop-archive-error">${escapeHtml(state.errors.desktopArchive)}</p>` : ""}
    ${state.desktop ? renderFolderArchiveSummary(state.desktop) : renderEmptyState("Folder not analyzed yet", "Refresh C-drive rescue or create an archive plan to analyze this folder.")}
    <div data-testid="cleanup-desktop-archive-plan-result">${state.desktopArchivePlan ? renderArchivePlan(state.desktopArchivePlan) : renderEmptyState("No archive plan", "Create a plan before executing. High-risk and unsafe items stay skipped.")}</div>
    <div data-testid="cleanup-desktop-archive-execute-result">${state.desktopArchiveResult ? renderMoveResult(state.desktopArchiveResult) : renderEmptyState("No execution result", "Execution results, skipped items, failures, and report summary appear here.")}</div>
    <div data-testid="cleanup-desktop-archive-rollback" class="small-note"><strong>Recovery</strong><p>Use the target folder and report summary to move files back manually, or use matching rollback records when available.</p></div>
  </section>`;
}

function renderDownloadsArchiveSection(state: CleanupWorkbenchState): string {
  return `<section class="panel" data-testid="cleanup-downloads-archive-section">
    <div class="panel-head"><div><h2>Downloads rescue archive</h2><p>Analyze and archive selected Downloads clutter through a token-gated move plan.</p></div></div>
    <div class="toolbar">
      ${renderActionButton("create-downloads-archive-plan", "Create archive plan")}
      ${renderActionButton("execute-downloads-archive-plan", "Execute archive plan", "danger")}
    </div>
    ${state.errors.downloadsArchive ? `<p class="error-text" data-testid="cleanup-downloads-archive-error">${escapeHtml(state.errors.downloadsArchive)}</p>` : ""}
    ${state.downloads ? renderFolderArchiveSummary(state.downloads) : renderEmptyState("Folder not analyzed yet", "Refresh C-drive rescue or create an archive plan to analyze this folder.")}
    <div data-testid="cleanup-downloads-archive-plan-result">${state.downloadsArchivePlan ? renderArchivePlan(state.downloadsArchivePlan) : renderEmptyState("No archive plan", "Create a plan before executing. High-risk and unsafe items stay skipped.")}</div>
    <div data-testid="cleanup-downloads-archive-execute-result">${state.downloadsArchiveResult ? renderMoveResult(state.downloadsArchiveResult) : renderEmptyState("No execution result", "Execution results, skipped items, failures, and report summary appear here.")}</div>
    <div data-testid="cleanup-downloads-archive-rollback" class="small-note"><strong>Recovery</strong><p>Use the target folder and report summary to move files back manually, or use matching rollback records when available.</p></div>
  </section>`;
}

function renderFolderArchiveSummary(report: FolderUsageReport): string {
  return `<div class="metrics">
    ${renderMetric("Files/categories", report.categories.length)}
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
    <p class="small-note"><strong>Preview required.</strong> Review source, target, skipped items, and warnings before executing.</p>
  </div>`;
}

function renderMoveResult(result: MoveResult): string {
  return `<div class="cleanup-result ${result.success ? "ok" : "warn"}">
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.resultSuccess"), result.success ? t("state.yes") : t("state.no"))}
      ${renderMetric(t("feature.cleanup.resultCleanedBytes"), formatBytes(result.movedBytes))}
      ${renderMetric(t("feature.cleanup.resultCleaned"), result.movedItems)}
      ${renderMetric("Target", result.targetPath)}
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
