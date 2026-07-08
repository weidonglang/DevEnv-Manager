import { escapeHtml, renderActionButton, renderMetric } from "../sharedView";
import { getActiveLocale, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { ToolchainWorkbenchState } from "./state";
import { toToolchainViewModel } from "./viewModel";

export function renderToolchainWorkbench(state: ToolchainWorkbenchState): string {
  const vm = toToolchainViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.toolchains.label")}</h2><p>${t("feature.toolchains.description")}</p></div></div>
        ${renderFeatureGuide("toolchains")}
        <div class="metrics">
          ${renderMetric(t("feature.toolchains.report"), vm.generatedAt, state.errors.report ?? "")}
          ${renderMetric(t("feature.toolchains.services"), vm.serviceCount, state.errors.services ?? "")}
          ${renderMetric(t("feature.toolchains.platforms"), vm.platformSummary, state.errors.system ?? state.errors.platform ?? "")}
          ${renderMetric(t("feature.toolchains.mysqlCandidates"), vm.mysqlCandidateCount, state.errors.mysql ?? "")}
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
      <section class="panel"><h2>${t("feature.toolchains.detail")}</h2>${renderRows(vm.detailRows)}</section>
      <section class="panel"><h2>${label("Platform detail", "平台详情")}</h2>${renderRows(vm.platformRows)}</section>
      <section class="panel"><h2>${label("Local services", "本地服务")}</h2>${renderRows(vm.serviceRows, label("No services loaded.", "尚未加载服务。"))}</section>
      <section class="panel"><h2>${t("feature.toolchains.mysqlRepair")}</h2>${renderRows(vm.mysqlRows)}</section>
    </div>
  `;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notChecked")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
