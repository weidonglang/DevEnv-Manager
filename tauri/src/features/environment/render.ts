import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { EnvironmentWorkbenchState } from "./state";
import { toEnvironmentViewModel } from "./viewModel";

export function renderEnvironmentWorkbench(state: EnvironmentWorkbenchState): string {
  const vm = toEnvironmentViewModel(state);
  return `
    <div class="feature-layout" data-testid="environment-page">
      <section class="panel" data-testid="environment-doctor-section">
        <div class="panel-head"><div><h2>${t("route.environment.label")}</h2><p>${t("feature.environment.description")}</p></div></div>
        ${renderFeatureGuide("environment")}
        <div class="metrics">
          ${renderMetric("JAVA_HOME raw", vm.javaHomeRaw, state.errors.reliability ?? "")}
          ${renderMetric("JAVA_HOME expanded", vm.javaHomeExpanded)}
          ${renderMetric("PATH first java", vm.pathFirstJava)}
          ${renderMetric("PATH first javac", vm.pathFirstJavac)}
          ${renderMetric("PATH warnings", vm.pathWarnings, vm.pathWarningDetail)}
          ${renderMetric(t("feature.fileAssociations.backups"), vm.backupCount, backupErrorText(state))}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-environment", t("feature.environment.inspect"), "primary")}
          ${renderActionButton("apply-user-environment-configuration", "Apply environment configuration", "danger")}
          ${renderActionButton("create-java-plan", t("dashboard.createJavaStabilizePlan"))}
          ${renderActionButton("apply-java-plan", t("feature.environment.applyPlan"), "danger")}
          ${renderActionButton("cleanup-path", t("feature.environment.cleanupPath"), "danger")}
          ${renderActionButton("export-environment-report", t("feature.environment.export"))}
        </div>
        ${state.checking ? `<div class="loading-state inline-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><strong>${t("feature.environment.checking")}</strong></div>` : ""}
        ${Object.keys(state.errors).length ? `<div class="error-state" data-testid="environment-error-panel">${Object.values(state.errors).map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>` : ""}
        ${renderEnvironmentConfiguration(state)}
        ${renderJdkPlanSelector(state)}
      </section>
      <section class="panel" data-testid="environment-result-panel"><h2>${t("feature.environment.details")}</h2>${renderRows(vm.detailRows)}</section>
      <section class="panel" data-testid="environment-path-section"><h2>${t("feature.environment.pathWarnings")}</h2>${renderRows(vm.pathRows)}<div data-testid="environment-path-cleanup-result">${state.pathCleanupError ? `<div class="error-state" data-testid="environment-path-cleanup-error">${escapeHtml(state.pathCleanupError)}</div>` : state.pathCleanupResult ? `<div class="small-note">${escapeHtml(state.pathCleanupResult)}</div>` : `<div class="empty">PATH cleanup has not been executed.</div>`}</div></section>
      <section class="panel"><h2>${t("feature.environment.issues")}</h2>${renderRows(vm.issueRows, t("state.notChecked"))}</section>
      ${renderPythonPanel(state)}
      ${renderRestorePanel(state)}
      <section class="panel" data-testid="environment-operation-result"><h2>${t("feature.environment.repairPlan")}</h2>${state.plan ? renderObjectTable(state.plan, ["planId", "createdAt", "target", "riskLevel", "backupName", "requiresTerminalRestart", "warnings", "disclaimer"]) : state.errors.createPlan ? "" : `<div class="empty">${t("feature.environment.noPlan")}</div>`}${renderApplyResult(state)}</section>
    </div>
  `;
}

function renderEnvironmentConfiguration(state: EnvironmentWorkbenchState): string {
  const preview = state.preview;
  return `<section class="subpanel" data-testid="environment-configuration-section">
    <h3>User environment configuration</h3>
    <div data-testid="environment-configuration-preview">${preview ? `
      ${renderObjectTable(preview, ["previewId", "createdAt", "backupName"])}
      ${renderRows(preview.changes.map((change) => ({ label: change.name, value: `${change.current || "not set"} -> ${change.proposed || "not set"} (${change.impact})` })))}
      ${renderRows([
        { label: "PATH additions", value: preview.pathAdded.join("; ") || "none" },
        { label: "PATH removals", value: preview.pathRemoved.join("; ") || "none" },
        { label: "Warnings", value: preview.warnings.join("; ") || "none" },
      ])}
    ` : `<div class="empty">Refresh to create a configuration preview.</div>`}</div>
    <div data-testid="environment-configuration-result">${state.configurationError ? `<div class="error-state" data-testid="environment-configuration-error">${escapeHtml(state.configurationError)}</div>` : state.configurationResult ? `<div class="small-note">${escapeHtml(state.configurationResult)}</div>` : `<div class="empty">Configuration has not been applied.</div>`}</div>
  </section>`;
}

function renderPythonPanel(state: EnvironmentWorkbenchState): string {
  const analysis = state.pythonAnalysis;
  const pythonRows = analysis ? [
    { label: "python executable", value: analysis.currentPython?.path || "Not detected" },
    { label: "python version", value: analysis.currentPython?.version || "Not detected" },
    { label: "pip executable", value: analysis.currentPip?.path || "Not detected" },
    { label: "pip ownership", value: analysis.currentPip?.detail || "Not checked" },
    { label: "py launcher", value: [analysis.launcherPath, analysis.launcherOutput].filter(Boolean).join(" - ") || "Not detected" },
    { label: "PATH first python", value: analysis.firstPythonOnPath || "Not detected" },
    { label: "PATH first pip", value: analysis.firstPipOnPath || "Not detected" },
    { label: "python execution alias", value: pythonAliasStatus(analysis.firstPythonOnPath) },
    { label: "python3 execution alias", value: pythonAliasStatus(analysis.firstPython3OnPath) },
    { label: "Execution alias risk", value: analysis.storeAliasRisk ? "Windows Store alias risk detected" : "No Store alias risk detected" },
    { label: "Managed repair eligible", value: analysis.managedPythonAvailable ? "yes" : "no - external Python remains read-only" },
  ] : [];
  return `<section class="panel" data-testid="environment-python-health-section">
    <div class="panel-head"><div><h2>Python health and repair</h2><p>Diagnose executable ownership, pip, launcher, aliases, and PATH before creating a guarded repair plan.</p></div></div>
    <div class="toolbar">
      ${renderActionButton("analyze-python-environment", "Analyze Python", "primary")}
      ${renderActionButton("open-python-alias-settings", "Open execution alias settings")}
    </div>
    <div data-testid="environment-python-alias-result">${state.aliasError ? `<div class="error-state">${escapeHtml(state.aliasError)}</div>` : state.aliasResult ? `<div class="small-note">${escapeHtml(state.aliasResult)}</div>` : `<div class="empty">Alias settings have not been opened.</div>`}</div>
    <div data-testid="environment-python-analysis-result">${analysis ? renderRows(pythonRows) : `<div class="empty">Run Python analysis to inspect the current environment.</div>`}</div>
    ${analysis?.repairBlockers.length ? `<div class="error-state">${analysis.repairBlockers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>` : ""}
    <div class="form-grid">
      <label class="checkbox-row"><input id="python-repair-pip" type="checkbox" checked />Repair pip ownership/components</label>
      <label class="checkbox-row"><input id="python-repair-path" type="checkbox" checked />Prepend current Python and Scripts to user PATH</label>
    </div>
    <div class="toolbar">
      ${renderActionButton("preview-python-repair", "Create repair preview")}
      ${renderActionButton("execute-python-repair", "Execute repair plan", "danger")}
    </div>
    <div data-testid="environment-python-plan-preview">${state.pythonPlan ? renderObjectTable(state.pythonPlan, ["planId", "createdAt", "pythonPath", "actions", "commands", "pathAdded", "warnings", "backupName"]) : `<div class="empty">No Python repair plan.</div>`}</div>
    <div class="small-note">Rollback guidance: use the environment backup restore panel below with the backup receipt created during execution.</div>
    <div data-testid="environment-python-repair-result">${state.pythonError ? `<div class="error-state">${escapeHtml(state.pythonError)}</div>` : state.pythonResult ? `<div class="small-note">${escapeHtml(state.pythonResult)}</div>` : `<div class="empty">No Python repair has been executed.</div>`}</div>
  </section>`;
}

function pythonAliasStatus(path: string): string {
  if (!path) return "Not resolved on PATH";
  return path.toLowerCase().includes("\\windowsapps\\") ? `Store execution alias enabled: ${path}` : `Resolves to installed Python: ${path}`;
}

function renderRestorePanel(state: EnvironmentWorkbenchState): string {
  const options = [
    ...state.envBackups.map((backup) => ({ id: `envCore:${backup.backupName}`, label: `${backup.createdAt} - ${backup.reason} - ${backup.backupName}` })),
    ...state.environmentBackups.map((backup) => ({ id: `legacy:${backup.fileName}`, label: `${backup.createdAt} - legacy environment backup - ${backup.fileName}` })),
  ];
  const plan = state.restorePlan;
  return `<section class="panel" data-testid="environment-restore-section">
    <div class="panel-head"><div><h2>Restore environment backup</h2><p>Select a backup, preview changed variables, then confirm a token-gated restore. A new safety backup is created before writing.</p></div></div>
    <div class="form-grid">
      <select id="environment-backup-select" data-testid="environment-backup-select">
        <option value="">Select an environment backup</option>
        ${options.map((option) => `<option value="${escapeHtml(option.id)}" ${state.selectedBackupId === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>
    <div class="toolbar">
      ${renderActionButton("create-environment-restore-plan", "Preview restore", "primary")}
      ${renderActionButton("execute-environment-restore", "Restore selected backup", "danger")}
    </div>
    <div data-testid="environment-restore-plan-preview">${plan ? renderRows([
      { label: "Backup", value: plan.backupName },
      { label: "Created", value: plan.createdAt },
      { label: "Reason", value: plan.reason },
      { label: "Changed variables", value: plan.changedVariables.join(", ") || "Metadata-only legacy backup; values are verified by the backend" },
      { label: "JAVA_HOME", value: `${plan.currentJavaHome || "not set"} -> ${plan.backupJavaHome || "not set"}` },
      { label: "PATH entries", value: `${plan.currentPathEntries} -> ${plan.backupPathEntries}` },
      { label: "Risk", value: "High - writes user environment; terminal and IDE restart required" },
      { label: "Rollback", value: "The backend creates a new pre-restore safety backup" },
    ]) : `<div class="empty">No restore plan.</div>`}</div>
    <div data-testid="environment-restore-result">${state.restoreError ? `<div class="error-state">${escapeHtml(state.restoreError)}</div>` : state.restoreResult ? `<div class="small-note">${escapeHtml(state.restoreResult)}</div><div class="small-note">${escapeHtml(state.restoreVerification)}</div>` : `<div class="empty">No backup has been restored.</div>`}</div>
  </section>`;
}

function renderApplyResult(state: EnvironmentWorkbenchState): string {
  return `<div data-testid="environment-java-stabilize-execute-result">
    ${state.errors.createPlan ? `<div class="error-state" data-testid="environment-java-stabilize-plan-error">${escapeHtml(state.errors.createPlan)}</div>` : ""}
    ${state.createPlanFailure ? renderObjectTable(state.createPlanFailure, ["step", "command", "exitCode", "readableError", "nextStep"]) : ""}
    ${state.errors.applyResult ? `<div class="error-state">${escapeHtml(state.errors.applyResult)}</div>` : ""}
    ${state.applyResult ? `<div class="small-note">${escapeHtml(state.applyResult)}</div>` : state.errors.createPlan || state.errors.applyResult ? "" : `<div class="empty">${t("state.notChecked")}</div>`}
  </div>`;
}

function renderJdkPlanSelector(state: EnvironmentWorkbenchState): string {
  const candidates = state.reliability?.java.candidates ?? [];
  const current = state.reliability?.java.javaHomeExpanded || state.reliability?.userEnv.javaHomeExpanded || "";
  const selected = state.selectedJdkRoot;
  const selectedInCandidates = candidates.some((candidate) => candidate.path === selected) || current === selected;
  return `<div class="form-grid environment-plan-input" data-testid="environment-jdk-picker">
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
