import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { EnvironmentWorkbenchState } from "./state";
import { toEnvironmentViewModel } from "./viewModel";

export function renderEnvironmentWorkbench(state: EnvironmentWorkbenchState): string {
  const vm = toEnvironmentViewModel(state);
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.environment.label")}</h2><p>${t("feature.environment.description")}</p></div></div>
        ${renderFeatureGuide("environment")}
        <div class="metrics">
          ${renderMetric("JAVA_HOME raw", vm.javaHomeRaw, state.errors.reliability ?? "")}
          ${renderMetric("JAVA_HOME expanded", vm.javaHomeExpanded)}
          ${renderMetric("PATH first java", vm.pathFirstJava)}
          ${renderMetric("PATH warnings", vm.pathWarnings, vm.pathWarningDetail)}
          ${renderMetric(t("feature.fileAssociations.backups"), vm.backupCount, backupErrorText(state))}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-environment", t("feature.environment.inspect"), "primary")}
          ${renderActionButton("create-java-plan", t("dashboard.createJavaStabilizePlan"))}
          ${renderActionButton("apply-java-plan", t("feature.environment.applyPlan"), "danger")}
          ${renderActionButton("cleanup-path", t("feature.environment.cleanupPath"), "danger")}
          ${renderActionButton("export-environment-report", t("feature.environment.export"))}
        </div>
        ${state.checking ? `<div class="loading-state inline-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><strong>${t("feature.environment.checking")}</strong></div>` : ""}
        ${renderJdkPlanSelector(state)}
      </section>
      <section class="panel"><h2>${t("feature.environment.details")}</h2>${renderRows(vm.detailRows)}</section>
      <section class="panel"><h2>${t("feature.environment.pathWarnings")}</h2>${renderRows(vm.pathRows)}</section>
      <section class="panel"><h2>${t("feature.environment.issues")}</h2>${renderRows(vm.issueRows, t("state.notChecked"))}</section>
      <section class="panel"><h2>${t("feature.environment.repairPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "backupName", "summary", "warnings"]) : `<div class="empty">${t("feature.environment.noPlan")}</div>`}</section>
    </div>
  `;
}

function renderJdkPlanSelector(state: EnvironmentWorkbenchState): string {
  const candidates = state.reliability?.java.candidates ?? [];
  const current = state.reliability?.java.javaHomeExpanded || state.reliability?.userEnv.javaHomeExpanded || "";
  const selected = state.selectedJdkRoot;
  const selectedInCandidates = candidates.some((candidate) => candidate.path === selected) || current === selected;
  return `<div class="form-grid environment-plan-input">
    <select id="java-plan-jdk-path">
      <option value="">${t("feature.environment.selectJdkRoot")}</option>
      ${selected && !selectedInCandidates ? `<option value="${escapeHtml(selected)}" selected>${t("feature.environment.manualJdkRoot")}: ${escapeHtml(selected)}</option>` : ""}
      ${current ? `<option value="${escapeHtml(current)}" ${selected === current ? "selected" : ""}>${t("feature.environment.currentJavaHome")}: ${escapeHtml(current)}</option>` : ""}
      ${candidates.map((candidate) => `<option value="${escapeHtml(candidate.path)}" ${selected === candidate.path ? "selected" : ""}>${escapeHtml(candidate.version)} - ${escapeHtml(candidate.source)} - ${escapeHtml(candidate.path)}</option>`).join("")}
    </select>
    <input id="java-plan-selected-root" readonly value="${escapeHtml(selected)}" placeholder="${t("feature.environment.noJdkRootSelected")}" />
    ${renderActionButton("choose-jdk-root", t("feature.environment.chooseJdkRoot"))}
  </div>`;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notAvailable")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function backupErrorText(state: EnvironmentWorkbenchState): string {
  return [state.errors.envBackups, state.errors.environmentBackups].filter(Boolean).join(" ");
}
