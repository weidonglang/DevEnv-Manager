import { renderActionButton, renderMetric, renderObjectTable, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { EnvironmentWorkbenchState } from "./state";

export function renderEnvironmentWorkbench(state: EnvironmentWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.environment.label")}</h2><p>${t("feature.environment.description")}</p></div></div>
        ${renderFeatureGuide("environment")}
        <div class="metrics">
          ${renderMetric("JAVA_HOME raw", valueOf(state.reliability, "javaHomeRaw"))}
          ${renderMetric("JAVA_HOME expanded", valueOf(state.reliability, "javaHomeExpanded"))}
          ${renderMetric(t("dashboard.pathWarnings"), state.health.length)}
          ${renderMetric(t("feature.fileAssociations.backups"), state.envBackups.length + state.environmentBackups.length)}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-environment", t("feature.environment.inspect"), "primary")}
          ${renderActionButton("create-java-plan", t("dashboard.createJavaStabilizePlan"))}
          ${renderActionButton("apply-java-plan", t("feature.environment.applyPlan"), "danger")}
          ${renderActionButton("cleanup-path", t("feature.environment.cleanupPath"), "danger")}
          ${renderActionButton("export-environment-report", t("feature.environment.export"))}
        </div>
      </section>
      <section class="panel"><h2>${t("feature.environment.details")}</h2>${renderObjectTable(state.reliability, ["javaHomeRaw", "javaHomeExpanded", "pathFirstJava", "pathFirstJavac", "pathFirstJar", "processJavaHome", "registryJavaHome"])}</section>
      <section class="panel"><h2>${t("feature.environment.repairPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "riskLevel", "backupName", "summary", "warnings"]) : `<div class="empty">${t("feature.environment.noPlan")}</div>`}</section>
    </div>
  `;
}
