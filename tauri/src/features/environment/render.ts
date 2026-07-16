import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { localize, t } from "../../core/i18n";
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
          ${renderMetric(localize("JAVA_HOME raw", "JAVA_HOME 原始值"), vm.javaHomeRaw, state.errors.reliability ?? "")}
          ${renderMetric(localize("JAVA_HOME expanded", "JAVA_HOME 展开值"), vm.javaHomeExpanded)}
          ${renderMetric(localize("First java on PATH", "PATH 中第一个 java"), vm.pathFirstJava)}
          ${renderMetric(localize("First javac on PATH", "PATH 中第一个 javac"), vm.pathFirstJavac)}
          ${renderMetric(localize("PATH warnings", "PATH 警告"), vm.pathWarnings, vm.pathWarningDetail)}
          ${renderMetric(t("feature.fileAssociations.backups"), vm.backupCount, backupErrorText(state))}
        </div>
        <div class="toolbar">
          ${renderActionButton("inspect-environment", t("feature.environment.inspect"), "primary")}
          ${renderActionButton("apply-user-environment-configuration", localize("Apply environment configuration", "应用环境配置"), "danger")}
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
      <section class="panel" data-testid="environment-path-section"><h2>${t("feature.environment.pathWarnings")}</h2>${renderRows(vm.pathRows)}<div data-testid="environment-path-cleanup-result">${state.pathCleanupError ? `<div class="error-state" data-testid="environment-path-cleanup-error">${escapeHtml(state.pathCleanupError)}</div>` : state.pathCleanupResult ? `<div class="small-note">${escapeHtml(state.pathCleanupResult)}</div>` : `<div class="empty">${localize("PATH cleanup has not been executed.", "尚未执行 PATH 清理。")}</div>`}</div></section>
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
    <h3>${localize("User environment configuration", "用户环境配置")}</h3>
    <div data-testid="environment-configuration-preview">${preview ? `
      ${renderObjectTable(preview, ["previewId", "createdAt", "backupName"])}
      ${renderRows(preview.changes.map((change) => ({ label: change.name, value: `${change.current || localize("not set", "未设置")} -> ${change.proposed || localize("not set", "未设置")} (${change.impact})` })))}
      ${renderRows([
        { label: localize("PATH additions", "PATH 新增项"), value: preview.pathAdded.join("; ") || localize("none", "无") },
        { label: localize("PATH removals", "PATH 移除项"), value: preview.pathRemoved.join("; ") || localize("none", "无") },
        { label: localize("Warnings", "警告"), value: preview.warnings.join("; ") || localize("none", "无") },
      ])}
    ` : `<div class="empty">${localize("Refresh to create a configuration preview.", "刷新后创建配置预览。")}</div>`}</div>
    <div data-testid="environment-configuration-result">${state.configurationError ? `<div class="error-state" data-testid="environment-configuration-error">${escapeHtml(state.configurationError)}</div>` : state.configurationResult ? `<div class="small-note">${escapeHtml(state.configurationResult)}</div>` : `<div class="empty">${localize("Configuration has not been applied.", "尚未应用配置。")}</div>`}</div>
  </section>`;
}

function renderPythonPanel(state: EnvironmentWorkbenchState): string {
  const analysis = state.pythonAnalysis;
  const pythonRows = analysis ? [
    { label: localize("python executable", "python 可执行文件"), value: analysis.currentPython?.path || localize("Not detected", "未检测到") },
    { label: localize("python version", "python 版本"), value: analysis.currentPython?.version || localize("Not detected", "未检测到") },
    { label: localize("pip executable", "pip 可执行文件"), value: analysis.currentPip?.path || localize("Not detected", "未检测到") },
    { label: localize("pip ownership", "pip 归属"), value: analysis.currentPip?.detail || localize("Not checked", "未检查") },
    { label: localize("py launcher", "py 启动器"), value: [analysis.launcherPath, analysis.launcherOutput].filter(Boolean).join(" - ") || localize("Not detected", "未检测到") },
    { label: localize("First python on PATH", "PATH 中第一个 python"), value: analysis.firstPythonOnPath || localize("Not detected", "未检测到") },
    { label: localize("First pip on PATH", "PATH 中第一个 pip"), value: analysis.firstPipOnPath || localize("Not detected", "未检测到") },
    { label: localize("python execution alias", "python 执行别名"), value: pythonAliasStatus(analysis.firstPythonOnPath) },
    { label: localize("python3 execution alias", "python3 执行别名"), value: pythonAliasStatus(analysis.firstPython3OnPath) },
    { label: localize("Execution alias risk", "执行别名风险"), value: analysis.storeAliasRisk ? localize("Windows Store alias risk detected", "检测到 Windows Store 别名风险") : localize("No Store alias risk detected", "未检测到 Store 别名风险") },
    { label: localize("Managed repair eligible", "可执行受管修复"), value: analysis.managedPythonAvailable ? t("state.yes") : localize("No - external Python remains read-only", "否 - 外部 Python 保持只读") },
  ] : [];
  return `<section class="panel" data-testid="environment-python-health-section">
    <div class="panel-head"><div><h2>${localize("Python health and repair", "Python 健康检查与修复")}</h2><p>${localize("Diagnose executable ownership, pip, launcher, aliases, and PATH before creating a guarded repair plan.", "创建受保护的修复计划前，诊断可执行文件归属、pip、启动器、别名和 PATH。")}</p></div></div>
    <div class="toolbar">
      ${renderActionButton("analyze-python-environment", localize("Analyze Python", "分析 Python"), "primary")}
      ${renderActionButton("open-python-alias-settings", localize("Open execution alias settings", "打开执行别名设置"))}
    </div>
    <div data-testid="environment-python-alias-result">${state.aliasError ? `<div class="error-state">${escapeHtml(state.aliasError)}</div>` : state.aliasResult ? `<div class="small-note">${escapeHtml(state.aliasResult)}</div>` : `<div class="empty">${localize("Alias settings have not been opened.", "尚未打开执行别名设置。")}</div>`}</div>
    <div data-testid="environment-python-analysis-result">${analysis ? renderRows(pythonRows) : `<div class="empty">${localize("Run Python analysis to inspect the current environment.", "运行 Python 分析以检查当前环境。")}</div>`}</div>
    ${analysis?.repairBlockers.length ? `<div class="error-state">${analysis.repairBlockers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>` : ""}
    <div class="form-grid">
      <label class="checkbox-row"><input id="python-repair-pip" type="checkbox" checked />${localize("Repair pip ownership/components", "修复 pip 归属或组件")}</label>
      <label class="checkbox-row"><input id="python-repair-path" type="checkbox" checked />${localize("Prepend current Python and Scripts to user PATH", "将当前 Python 与 Scripts 添加到用户 PATH 前部")}</label>
    </div>
    <div class="toolbar">
      ${renderActionButton("preview-python-repair", localize("Create repair preview", "创建修复预览"))}
      ${renderActionButton("execute-python-repair", localize("Execute repair plan", "执行修复计划"), "danger")}
    </div>
    <div data-testid="environment-python-plan-preview">${state.pythonPlan ? renderObjectTable(state.pythonPlan, ["planId", "createdAt", "pythonPath", "actions", "commands", "pathAdded", "warnings", "backupName"]) : `<div class="empty">${localize("No Python repair plan.", "尚无 Python 修复计划。")}</div>`}</div>
    <div class="small-note">${localize("Rollback guidance: use the environment backup restore panel below with the backup receipt created during execution.", "回滚说明：使用执行时创建的备份回执，在下方环境备份恢复面板中回滚。")}</div>
    <div data-testid="environment-python-repair-result">${state.pythonError ? `<div class="error-state">${escapeHtml(state.pythonError)}</div>` : state.pythonResult ? `<div class="small-note">${escapeHtml(state.pythonResult)}</div>` : `<div class="empty">${localize("No Python repair has been executed.", "尚未执行 Python 修复。")}</div>`}</div>
  </section>`;
}

function pythonAliasStatus(path: string): string {
  if (!path) return localize("Not resolved on PATH", "PATH 中未解析到");
  return path.toLowerCase().includes("\\windowsapps\\") ? `${localize("Store execution alias enabled", "已启用 Store 执行别名")}: ${path}` : `${localize("Resolves to installed Python", "解析到已安装的 Python")}: ${path}`;
}

function renderRestorePanel(state: EnvironmentWorkbenchState): string {
  const options = [
    ...state.envBackups.map((backup) => ({ id: `envCore:${backup.backupName}`, label: `${backup.createdAt} - ${backup.reason} - ${backup.backupName}` })),
    ...state.environmentBackups.map((backup) => ({ id: `legacy:${backup.fileName}`, label: `${backup.createdAt} - ${localize("legacy environment backup", "旧版环境备份")} - ${backup.fileName}` })),
  ];
  const plan = state.restorePlan;
  return `<section class="panel" data-testid="environment-restore-section">
    <div class="panel-head"><div><h2>${localize("Restore environment backup", "恢复环境备份")}</h2><p>${localize("Select a backup, preview changed variables, then confirm a token-gated restore. A new safety backup is created before writing.", "选择备份并预览变量变化，再通过令牌确认恢复；写入前会创建新的安全备份。")}</p></div></div>
    <div class="form-grid">
      <select id="environment-backup-select" data-testid="environment-backup-select">
        <option value="">${localize("Select an environment backup", "选择环境备份")}</option>
        ${options.map((option) => `<option value="${escapeHtml(option.id)}" ${state.selectedBackupId === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>
    <div class="toolbar">
      ${renderActionButton("create-environment-restore-plan", localize("Preview restore", "预览恢复"), "primary")}
      ${renderActionButton("execute-environment-restore", localize("Restore selected backup", "恢复所选备份"), "danger")}
    </div>
    <div data-testid="environment-restore-plan-preview">${plan ? renderRows([
      { label: localize("Backup", "备份"), value: plan.backupName },
      { label: localize("Created", "创建时间"), value: plan.createdAt },
      { label: localize("Reason", "原因"), value: plan.reason },
      { label: localize("Changed variables", "变更变量"), value: plan.changedVariables.join(", ") || localize("Metadata-only legacy backup; values are verified by the backend", "仅含元数据的旧版备份；值由后端验证") },
      { label: "JAVA_HOME", value: `${plan.currentJavaHome || localize("not set", "未设置")} -> ${plan.backupJavaHome || localize("not set", "未设置")}` },
      { label: localize("PATH entries", "PATH 项数"), value: `${plan.currentPathEntries} -> ${plan.backupPathEntries}` },
      { label: localize("Risk", "风险"), value: localize("High - writes user environment; terminal and IDE restart required", "高 - 写入用户环境；需要重启终端和 IDE") },
      { label: localize("Rollback", "回滚"), value: localize("The backend creates a new pre-restore safety backup", "后端会在恢复前创建新的安全备份") },
    ]) : `<div class="empty">${localize("No restore plan.", "尚无恢复计划。")}</div>`}</div>
    <div data-testid="environment-restore-result">${state.restoreError ? `<div class="error-state">${escapeHtml(state.restoreError)}</div>` : state.restoreResult ? `<div class="small-note">${escapeHtml(state.restoreResult)}</div><div class="small-note">${escapeHtml(state.restoreVerification)}</div>` : `<div class="empty">${localize("No backup has been restored.", "尚未恢复备份。")}</div>`}</div>
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
