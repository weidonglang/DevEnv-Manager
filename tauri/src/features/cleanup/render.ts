import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { CleanupWorkbenchState } from "./state";

export function renderCleanupWorkbench(state: CleanupWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.cleanup.label")}</h2><p>${t("feature.cleanup.description")}</p></div></div>
        ${renderFeatureGuide("cleanup")}
        <div class="metrics">
          ${renderMetric(t("feature.cleanup.scanned"), valueOf(state.scan, "totalItems", "0"))}
          ${renderMetric(t("feature.cleanup.bytes"), valueOf(state.scan, "totalBytes", "0"))}
          ${renderMetric(t("feature.cleanup.rollbackRecords"), state.rollbackRecords.length)}
          ${renderMetric(t("feature.cleanup.selected"), state.selectedIds.length)}
        </div>
        <div class="toolbar">
          ${renderActionButton("scan-cleanup", t("feature.cleanup.scan"), "primary")}
          ${renderActionButton("create-cleanup-plan", t("feature.cleanup.createPlan"))}
          ${renderActionButton("clear-download-cache", t("feature.cleanup.clearDownloads"), "danger")}
          ${renderActionButton("clean-dev-cache", t("feature.cleanup.cleanDev"), "danger")}
          ${renderActionButton("create-move-plan", t("feature.cleanup.createMove"))}
          ${renderActionButton("execute-move-plan", t("feature.cleanup.executeMove"), "danger")}
          ${renderActionButton("rollback-move", t("feature.cleanup.rollbackMove"), "danger")}
          ${renderActionButton("create-expansion-plan", t("feature.cleanup.expansion"))}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.cleanup.report")}</h2>${state.scan ? renderObjectTable(state.scan, ["generatedAt", "totalItems", "totalBytes", "warnings"]) : `<div class="empty">${t("feature.cleanup.noScan")}</div>`}</section>
      <section class="panel"><h2>${t("feature.cleanup.plans")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "estimatedBytes", "requiresAdmin", "riskSummary", "warnings"]) : `<div class="empty">${t("feature.cleanup.noPlan")}</div>`}${state.movePlan ? renderObjectTable(state.movePlan, ["planId", "source", "target", "mode", "warnings"]) : ""}</section>
    </div>
  `;
}
