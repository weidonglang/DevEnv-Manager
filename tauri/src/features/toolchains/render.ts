import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ToolchainWorkbenchState } from "./state";

export function renderToolchainWorkbench(state: ToolchainWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.toolchains.label")}</h2><p>${t("feature.toolchains.description")}</p></div></div>
        ${renderFeatureGuide("toolchains")}
        <div class="metrics">
          ${renderMetric(t("feature.toolchains.report"), valueOf(state.report, "generatedAt"))}
          ${renderMetric(t("feature.toolchains.services"), state.services.length)}
          ${renderMetric(t("feature.toolchains.platforms"), valueOf(state.system, "items"))}
          ${renderMetric(t("feature.toolchains.mysqlCandidates"), valueOf(state.mysql, "candidates"))}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-toolchains", t("feature.toolchains.inspect"), "primary")}
          ${renderActionButton("inspect-platforms", t("feature.toolchains.inspectPlatforms"))}
          ${renderActionButton("inspect-services", t("feature.toolchains.inspectServices"))}
          ${renderActionButton("manage-local-service", t("feature.toolchains.manageService"), "danger")}
          ${renderActionButton("manage-system-platform", t("feature.toolchains.managePlatform"), "danger")}
          ${renderActionButton("inspect-mysql", t("feature.toolchains.inspectMysql"))}
          ${renderActionButton("create-mysql-plan", t("feature.toolchains.createMysqlPlan"))}
          ${renderActionButton("execute-mysql-plan", t("feature.toolchains.executeMysqlPlan"), "danger")}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.toolchains.detail")}</h2>${renderObjectTable(state.report, ["git.git.status", "node.npmRegistry", "python.pipIndexUrl", "generatedAt"])}</section>
      <section class="panel"><h2>${t("feature.toolchains.mysqlRepair")}</h2>${state.mysqlPlan ? renderObjectTable(state.mysqlPlan, ["planId", "candidateId", "action", "riskLevel", "warnings"]) : renderObjectTable(state.mysql, ["generatedAt", "candidates", "conclusion"])}</section>
    </div>
  `;
}
