import { formatBytes } from "../../core/format";
import type { CleanupCandidate, DiskVolumeInfo, FolderUsageReport, LargeFileItem } from "../../types";
import { escapeHtml, pageItems, renderActionButton, renderBadge, renderEmptyState, renderMetric, renderObjectTable, renderPagination, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { CleanupWorkbenchState } from "./state";

export function renderCleanupWorkbench(state: CleanupWorkbenchState): string {
  const selected = selectedCleanableCandidates(state);
  return `
    <div class="feature-layout">
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
        <div class="form-grid environment-plan-input">
          <input id="cleanup-move-source" value="${escapeHtml(state.moveSource)}" placeholder="${t("feature.cleanup.moveSource")}" />
          <input id="cleanup-move-target-drive" value="${escapeHtml(state.moveTargetDrive)}" placeholder="${t("feature.cleanup.moveTargetDrive")}" />
          <select id="cleanup-move-mode">
            <option value="archive" ${state.moveMode === "archive" ? "selected" : ""}>${t("feature.cleanup.moveModeArchive")}</option>
            <option value="junction" ${state.moveMode === "junction" ? "selected" : ""}>${t("feature.cleanup.moveModeJunction")}</option>
          </select>
          ${renderActionButton("choose-cleanup-move-source", t("feature.cleanup.chooseMoveSource"))}
        </div>
      </section>
      ${renderCDriveRescue(state)}
      ${renderCleanupReport(state)}
      ${renderLargeFiles(state)}
      <section class="panel"><h2>${t("feature.cleanup.plans")}</h2>${renderCleanupPlan(state)}${renderCleanupExecutionResult(state)}${state.movePlan ? renderObjectTable(state.movePlan, ["planId", "source", "target", "mode", "warnings"]) : ""}${state.expansionPlan ? renderObjectTable(state.expansionPlan, ["planId", "mode", "canExecute", "requiresAdmin", "estimatedAddedBytes", "backupRequired", "explanation"]) : ""}${state.expansionResult ? renderObjectTable(state.expansionResult, ["planId", "success", "beforeFree", "afterFree", "output"]) : ""}</section>
    </div>
  `;
}

function renderCDriveRescue(state: CleanupWorkbenchState): string {
  const overview = state.overview;
  const partition = state.partition;
  return `<section class="panel">
    <div class="panel-head"><div><h2>${t("feature.cleanup.cRescue")}</h2><p>${t("feature.cleanup.cRescueDetail")}</p></div></div>
    <div class="metrics">
      ${renderMetric(t("feature.cleanup.cFree"), overview ? formatBytes(overview.cDrive.freeBytes) : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.cUsed"), overview ? `${overview.cDrive.usedPercent.toFixed(1)}%` : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.safeCleanEstimate"), overview ? formatBytes(overview.safeCleanEstimate) : t("state.notChecked"))}
      ${renderMetric(t("feature.cleanup.devCacheEstimate"), overview ? formatBytes(overview.devCacheEstimate) : t("state.notChecked"))}
    </div>
    ${state.errors.cRescue ? `<p class="error-text">${escapeHtml(state.errors.cRescue)}</p>` : ""}
    ${overview ? renderStringList(t("feature.cleanup.suggestions"), overview.suggestions) : ""}
    ${overview ? renderVolumes(overview.volumes) : ""}
    ${partition ? renderPartition(partition) : renderEmptyState(t("feature.cleanup.partitionNotChecked"), t("feature.cleanup.partitionNotCheckedDetail"))}
    ${state.architecture ? renderStringList(t("feature.cleanup.safetyRules"), state.architecture.safetyRules) : ""}
    <div class="folder-overview-grid">
      ${renderFolderOverview(t("feature.cleanup.desktop"), state.desktop)}
      ${renderFolderOverview(t("feature.cleanup.downloads"), state.downloads)}
    </div>
  </section>`;
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
  return `<div class="cleanup-result ${result.success ? "ok" : "warn"}">
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
  </article>`).join("")}</div>`;
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
