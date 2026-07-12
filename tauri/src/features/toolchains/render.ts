import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { getActiveLocale, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { LocalServiceStatus } from "../../types";
import type { ToolchainWorkbenchState } from "./state";
import { toToolchainViewModel } from "./viewModel";

export function renderToolchainWorkbench(state: ToolchainWorkbenchState): string {
  const vm = toToolchainViewModel(state);
  return `
    <div class="feature-layout" data-testid="toolchains-page">
      <section class="panel" data-testid="toolchains-overview-section">
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
          ${renderActionButton("inspect-mysql", t("feature.toolchains.inspectMysql"))}
          ${renderActionButton("create-mysql-plan", t("feature.toolchains.createMysqlPlan"))}
          ${renderActionButton("execute-mysql-plan", t("feature.toolchains.executeMysqlPlan"), "danger")}
        </div>
        ${Object.keys(state.errors).length ? `<div class="error-state" data-testid="toolchains-error">${Object.values(state.errors).map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>` : ""}
      </section>
      <section class="panel" data-testid="toolchains-result"><h2>${t("feature.toolchains.detail")}</h2>${renderRows(vm.detailRows)}</section>
      ${renderPlatformManagement(state, vm.platformRows)}
      ${renderLocalServices(state)}
      <section class="panel" data-testid="toolchains-mysql-section"><h2>${t("feature.toolchains.mysqlRepair")}</h2>${state.operationError ? `<div class="error-state" data-testid="toolchains-mysql-error">${escapeHtml(state.operationError)}</div>` : ""}${renderRows(vm.mysqlRows)}<div data-testid="toolchains-mysql-result">${state.mysqlResult ? renderObjectTable(state.mysqlResult, ["success", "message"]) : `<div class="empty">${t("state.notChecked")}</div>`}</div></section>
      ${renderLearningCenter(state)}
    </div>
  `;
}

function renderPlatformManagement(state: ToolchainWorkbenchState, rows: Array<{ label: string; value: string }>): string {
  const system = state.system;
  const action = state.platformAction;
  const value = state.platformValue || system?.wslItems[0]?.name || "";
  const dockerDetected = Boolean(system?.dockerDesktopPath);
  return `<section class="panel" data-testid="platform-management-section">
    <div class="panel-head"><div><h2>${label("Platforms", "平台管理")}</h2><p>${label("Inspect Docker Desktop and WSL, preview one fixed backend action, then execute it through a confirmation token.", "检查 Docker Desktop 与 WSL，预览固定后端操作后再通过确认令牌执行。")}</p></div></div>
    ${renderRows(rows)}
    <div class="operation-grid">
      <article class="operation-card" data-testid="platform-docker-section">
        <h3>Docker Desktop</h3>
        <dl class="kv-list">
          <div><dt>${label("Status", "状态")}</dt><dd>${dockerDetected ? label("Installed", "已安装") : label("Not detected", "未检测到")}</dd></div>
          <div><dt>${label("Executable", "可执行文件")}</dt><dd>${escapeHtml(system?.dockerDesktopPath || label("No verified Docker Desktop path", "没有已验证的 Docker Desktop 路径"))}</dd></div>
          <div><dt>${label("Engine", "引擎")}</dt><dd>${escapeHtml(system?.dockerInfo || t("state.notChecked"))}</dd></div>
        </dl>
        <div class="toolbar">${renderActionButton("open-docker-desktop", label("Open Docker Desktop", "打开 Docker Desktop"), "primary")}</div>
        <p class="small-note">${dockerDetected ? label("Update or shutdown actions are available in the guarded operation preview below.", "下方受保护操作预览可执行更新或关闭。") : label("Use Docker install after reviewing the target and risk below.", "请在下方核对目标和风险后使用 Docker 安装。")}</p>
        <div data-testid="platform-docker-result">${state.dockerOpenError ? `<div class="error-state">${escapeHtml(state.dockerOpenError)}</div>` : state.dockerOpenResult ? `<div class="small-note">${escapeHtml(state.dockerOpenResult)}</div>` : `<div class="empty">${label("Docker Desktop has not been opened from this page.", "尚未从此页面打开 Docker Desktop。")}</div>`}</div>
      </article>
      <article class="operation-card" data-testid="platform-operation-section">
        <h3>${label("Guarded platform operation", "受保护的平台操作")}</h3>
        <label>${label("Action", "操作")}<select id="platform-action" data-testid="platform-action-select">${platformActionOptions(action)}</select></label>
        ${action === "wsl_install_distro"
          ? `<label>${label("Distribution", "发行版")}<input id="platform-value" data-testid="platform-value-input" value="${escapeHtml(value)}" placeholder="Ubuntu" /></label>`
          : action.startsWith("wsl_") && ["wsl_start", "wsl_terminate", "wsl_set_default"].includes(action)
            ? `<label>${label("Installed distribution", "已安装发行版")}<select id="platform-distro" data-testid="platform-distro-select">${system?.wslItems.map((item) => `<option value="${escapeHtml(item.name)}" ${item.name === value ? "selected" : ""}>${escapeHtml(item.name)} - ${escapeHtml(item.state)}</option>`).join("") || `<option value="">${label("No installed distribution detected", "未检测到已安装发行版")}</option>`}</select></label>`
            : ""}
        <div class="plan-preview" data-testid="platform-operation-preview">
          ${renderRows([
            { label: label("Action", "操作"), value: action },
            { label: label("Target", "目标"), value: value || platformTarget(action) },
            { label: label("Risk", "风险"), value: label("High - confirmation token required", "高风险 - 需要确认令牌") },
            { label: label("Verification", "验证"), value: label("Re-inspect Docker/WSL state after execution", "执行后重新检查 Docker/WSL 状态") },
          ])}
        </div>
        <div class="toolbar">${renderActionButton("execute-platform-action", label("Confirm and execute", "确认并执行"), "danger")}</div>
        <div data-testid="platform-operation-result">${state.platformOperationError ? `<div class="error-state">${escapeHtml(state.platformOperationError)}</div>` : state.platformOperationResult ? `${renderObjectTable(state.platformOperationResult, ["success", "message"])}${state.platformVerification ? `<p class="small-note">${escapeHtml(state.platformVerification)}</p>` : ""}` : `<div class="empty">${label("No platform operation has been executed.", "尚未执行平台操作。")}</div>`}</div>
      </article>
    </div>
  </section>`;
}

function renderLocalServices(state: ToolchainWorkbenchState): string {
  const selected = state.services.find((service) => service.id === state.selectedServiceId);
  return `<section class="panel" data-testid="local-services-section">
    <div class="panel-head"><div><h2>${label("Local database services", "本地数据库服务")}</h2><p>${label("Select an explicit row. Directory, logs, and management actions stay bound to that service id.", "请明确选择一行；目录、日志和管理操作始终绑定该服务 ID。")}</p></div></div>
    <div class="table-wrap" data-testid="local-services-table"><table><thead><tr><th>${label("Select", "选择")}</th><th>${label("Service", "服务")}</th><th>${label("State", "状态")}</th><th>PID</th><th>${label("Executable / directory", "可执行文件 / 目录")}</th></tr></thead><tbody>${state.services.map((service) => renderServiceRow(service, state.selectedServiceId)).join("") || `<tr><td colspan="5"><div class="empty">${label("No services loaded. Run service inspection.", "尚未加载服务，请先检查服务。")}</div></td></tr>`}</tbody></table></div>
    ${selected ? renderSelectedService(state, selected) : `<div class="empty" data-testid="local-service-inline-guidance">${label("Select a service row to inspect paths, read logs, or preview a state change.", "选择服务行后可检查路径、读取日志或预览状态变更。")}</div>`}
  </section>`;
}

function renderServiceRow(service: LocalServiceStatus, selectedId: string): string {
  return `<tr class="${service.id === selectedId ? "is-selected" : ""}" data-testid="local-service-row">
    <td><button type="button" data-service-select="${escapeHtml(service.id)}" data-testid="local-service-select-${escapeHtml(service.id)}" aria-pressed="${service.id === selectedId}">${service.id === selectedId ? label("Selected", "已选择") : label("Select", "选择")}</button></td>
    <td><strong>${escapeHtml(service.name)}</strong><br><small>${escapeHtml(service.serviceName || label("No Windows service", "没有 Windows 服务"))}</small></td>
    <td>${escapeHtml(service.serviceState || label("Unknown", "未知"))}</td>
    <td>${service.pid || label("None", "无")}</td>
    <td>${escapeHtml(service.executablePath || service.pathStatus)}<br><small>${escapeHtml(service.installDirectory || service.binaryPath || service.pathStatus)}</small></td>
  </tr>`;
}

function renderSelectedService(state: ToolchainWorkbenchState, service: LocalServiceStatus): string {
  return `<div class="operation-grid" data-testid="local-service-selected-detail">
    <article class="operation-card" data-testid="local-service-directory-section">
      <h3>${label("Installation directory", "安装目录")}</h3>
      ${renderRows([
        { label: label("Display name", "显示名称"), value: service.name },
        { label: label("Service name", "服务名称"), value: service.serviceName || label("Not installed", "未安装") },
        { label: label("Executable", "可执行文件"), value: service.executablePath || service.pathStatus },
        { label: label("Directory", "目录"), value: service.installDirectory || service.pathStatus },
      ])}
      <div class="toolbar">${renderActionButton("open-service-directory", label("Open directory", "打开目录"))}${renderActionButton("copy-service-directory", label("Copy directory", "复制目录"))}</div>
      <div data-testid="local-service-directory-result">${state.servicePathError ? `<div class="error-state">${escapeHtml(state.servicePathError)}</div>` : state.servicePathResult ? `<div class="small-note">${escapeHtml(state.servicePathResult)}</div>` : `<div class="empty">${escapeHtml(service.pathStatus)}</div>`}</div>
    </article>
    <article class="operation-card" data-testid="local-service-logs-section">
      <h3>${label("Service logs", "服务日志")}</h3>
      <p class="small-note">${escapeHtml(service.logPathReason)}</p>
      <p class="small-note">${escapeHtml(service.logPath || label("No verified log file path", "没有已验证的日志文件路径"))}</p>
      <div class="toolbar">${renderActionButton("inspect-service-logs", label("Read recent events", "读取近期事件"), "primary")}${renderActionButton("open-service-log", label("Open log", "打开日志"))}${renderActionButton("copy-service-log", label("Copy log path", "复制日志路径"))}</div>
      <div data-testid="local-service-logs-result">${state.serviceLogError ? `<div class="error-state">${escapeHtml(state.serviceLogError)}</div>` : state.serviceLogText ? `<pre>${escapeHtml(state.serviceLogText)}</pre>` : `<div class="empty">${label("No service log query has run.", "尚未查询服务日志。")}</div>`}</div>
    </article>
    <article class="operation-card" data-testid="local-service-management-section">
      <h3>${label("Guarded service management", "受保护的服务管理")}</h3>
      <label>${label("Action", "操作")}<select id="service-action" data-testid="local-service-action-select">${["start", "stop", "restart"].map((action) => `<option value="${action}" ${action === state.serviceAction ? "selected" : ""}>${action}</option>`).join("")}</select></label>
      <div data-testid="local-service-operation-preview">${renderRows([
        { label: label("Display name", "显示名称"), value: service.name },
        { label: label("Service name", "服务名称"), value: service.serviceName || label("Not installed", "未安装") },
        { label: "PID", value: service.pid ? String(service.pid) : label("No active PID", "没有活动 PID") },
        { label: label("Executable / directory", "可执行文件 / 目录"), value: service.executablePath || service.installDirectory || service.pathStatus },
        { label: label("Current state", "当前状态"), value: service.serviceState || label("Unknown", "未知") },
        { label: label("Action", "操作"), value: state.serviceAction },
        { label: label("Risk", "风险"), value: label("High - confirmation token required", "高风险 - 需要确认令牌") },
      ])}</div>
      <div class="toolbar">${renderActionButton("manage-local-service", label("Confirm and execute", "确认并执行"), "danger")}</div>
      <div data-testid="local-service-operation-result">${state.serviceOperationError ? `<div class="error-state">${escapeHtml(state.serviceOperationError)}</div>` : state.serviceOperationResult ? `${renderObjectTable(state.serviceOperationResult, ["success", "message"])}${state.serviceVerification ? `<p class="small-note">${escapeHtml(state.serviceVerification)}</p>` : ""}` : `<div class="empty">${label("No service action has been executed.", "尚未执行服务操作。")}</div>`}</div>
    </article>
  </div>`;
}

function platformActionOptions(selected: string): string {
  const options: Array<[string, string, string]> = [
    ["docker_install", "Install Docker Desktop", "安装 Docker Desktop"],
    ["docker_update", "Update Docker Desktop", "更新 Docker Desktop"],
    ["docker_shutdown", "Shut down Docker Desktop", "关闭 Docker Desktop"],
    ["wsl_install", "Install WSL", "安装 WSL"],
    ["wsl_update", "Update WSL", "更新 WSL"],
    ["wsl_install_distro", "Install WSL distribution", "安装 WSL 发行版"],
    ["wsl_start", "Start WSL distribution", "启动 WSL 发行版"],
    ["wsl_terminate", "Terminate WSL distribution", "终止 WSL 发行版"],
    ["wsl_set_default", "Set default WSL distribution", "设为默认 WSL 发行版"],
  ];
  return options.map(([value, en, zh]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label(en, zh)}</option>`).join("");
}

function platformTarget(action: string): string {
  return action.startsWith("docker_") ? "Docker Desktop" : "Windows Subsystem for Linux";
}

function renderLearningCenter(state: ToolchainWorkbenchState): string {
  const commands = ["java -version", "javac -version", "python --version", "python -m pip --version", "node --version", "npm --version", "mvn -version", "gradle -version", "go version", "rustc --version", "cargo --version", "dotnet --info", "where java"];
  return `<section class="panel">
    <div class="panel-head"><div><h2>${t("feature.toolchains.learningCenter")}</h2><p>${t("feature.toolchains.learningCenterDetail")}</p></div></div>
    <div class="form-row command-row">
      <input id="learning-command" value="${escapeHtml(state.learningCommand)}" placeholder="${t("feature.toolchains.learningCommand")}" />
      ${renderActionButton("inspect-learning-command", t("feature.toolchains.inspectLearningCommand"))}
      ${renderActionButton("run-learning-command", t("feature.toolchains.runLearningCommand"), "primary")}
    </div>
    <div class="toolbar compact">${commands.map((command) => `<button type="button" data-learning-command="${escapeHtml(command)}">${escapeHtml(command)}</button>`).join("")}</div>
    <p class="small-note">${t("feature.toolchains.learningBoundary")}</p>
    ${state.learningError ? `<p class="error-text">${escapeHtml(state.learningError)}</p>` : ""}
    ${state.learningSafety ? `<h3>${t("feature.toolchains.learningSafety")}</h3>${renderObjectTable(state.learningSafety, ["allowed", "risk", "reason", "requiresConfirmation", "elevated", "executable"])}` : ""}
    ${state.learningResult ? `<h3>${t("feature.toolchains.learningResult")}</h3>${renderObjectTable(state.learningResult, ["success", "returnCode", "elapsedMs"])}<pre>${escapeHtml(state.learningResult.output)}</pre>` : ""}
  </section>`;
}

function renderRows(rows: Array<{ label: string; value: string }>, empty = t("state.notChecked")): string {
  return `<dl class="kv-list">${rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("") || `<div class="empty">${escapeHtml(empty)}</div>`}</dl>`;
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
