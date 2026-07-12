import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { getActiveLocale, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { LocalServiceStatus } from "../../types";
import type { ToolchainWorkbenchState } from "./state";
import { toToolchainViewModel } from "./viewModel";
import { defaultActionValue, selectedToolchainAction, toolchainActionDefinitions } from "./toolchainActions";

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
      ${renderEcosystemOverview(state)}
      ${renderToolchainActions(state)}
      ${renderMirrorCenter(state)}
      ${renderNetworkCache(state)}
      ${renderPlatformManagement(state, vm.platformRows)}
      ${renderLocalServices(state)}
      <section class="panel" data-testid="toolchains-mysql-section"><h2>${t("feature.toolchains.mysqlRepair")}</h2>${state.operationError ? `<div class="error-state" data-testid="toolchains-mysql-error">${escapeHtml(state.operationError)}</div>` : ""}${renderRows(vm.mysqlRows)}<div data-testid="toolchains-mysql-result">${state.mysqlResult ? renderObjectTable(state.mysqlResult, ["success", "message"]) : `<div class="empty">${t("state.notChecked")}</div>`}</div></section>
      ${renderLearningCenter(state)}
    </div>
  `;
}

function renderEcosystemOverview(state: ToolchainWorkbenchState): string {
  const git = state.report?.git;
  const node = state.report?.node;
  const python = state.report?.python;
  const rust = state.platform?.rust;
  const dotnet = state.platform?.dotnet;
  return `<section class="panel" data-testid="toolchains-ecosystems-section">
    <div class="panel-head"><div><h2>${label("Ecosystem diagnostics", "生态诊断")}</h2><p>${label("Versions, resolved executables, key configuration paths, and current source state from backend reports.", "展示后端报告中的版本、实际可执行文件、关键配置路径和当前源状态。")}</p></div></div>
    <div class="operation-grid" data-testid="toolchains-ecosystems-result">
      ${ecosystemCard("Git", [
        [label("Git", "Git"), toolState(git?.git)],
        [label("SSH", "SSH"), toolState(git?.ssh)],
        [label("Git LFS", "Git LFS"), toolState(git?.gitLfs)],
        [label("Global config", "全局配置"), git?.globalConfigPath || t("state.notChecked")],
        [label("GitHub SSH", "GitHub SSH"), git?.githubSshStatus || t("state.notChecked")],
        [label("GitHub HTTPS", "GitHub HTTPS"), git?.githubHttpsStatus || t("state.notChecked")],
      ], "toolchains-git-ecosystem")}
      ${ecosystemCard("Node", [
        ...toolRows(node?.tools),
        [label("npm registry", "npm 源"), node?.npmRegistry || t("state.notChecked")],
        [label("npm config", "npm 配置"), node?.npmConfigPath || t("state.notChecked")],
        [label("npm prefix", "npm 全局目录"), node?.npmPrefix || t("state.notChecked")],
        [label("pnpm store", "pnpm 存储"), node?.pnpmStorePath || t("state.notChecked")],
      ], "toolchains-node-ecosystem")}
      ${ecosystemCard("Python", [
        ...toolRows(python?.tools),
        [label("pip index", "pip 源"), python?.pipIndexUrl || t("state.notChecked")],
        [label("pip config path", "pip 配置路径"), python?.pipConfigPath || t("state.notChecked")],
        [label("pip config", "pip 配置"), python?.pipConfig || t("state.notChecked")],
      ], "toolchains-python-ecosystem")}
      ${ecosystemCard("Rust", [
        ...toolRows(rust?.tools),
        [label("Default toolchain", "默认工具链"), rust?.defaultToolchain || t("state.notChecked")],
        [label("Installed toolchains", "已安装工具链"), summarizeList(rust?.installedToolchains)],
        [label("Cargo config", "Cargo 配置"), rust?.cargoConfigPath || t("state.notChecked")],
        [label("Cargo source status", "Cargo 源状态"), state.platform?.mirrors.cargoConfigExists ? label("Cargo config exists; inspect the rust/cargo target below for the active source.", "Cargo 配置存在；请在下方检查 rust/cargo 目标的当前源。") : label("No Cargo config file detected", "未检测到 Cargo 配置文件")],
        [label("MSVC Build Tools", "MSVC Build Tools"), rust?.msvcBuildTools || t("state.notChecked")],
      ], "toolchains-rust-ecosystem")}
      ${ecosystemCard(".NET", [
        [label("SDK executable", "SDK 可执行文件"), toolState(dotnet?.dotnet)],
        [label("SDKs", "SDK 列表"), summarizeList(dotnet?.sdks)],
        [label("Runtimes", "运行时"), summarizeList(dotnet?.runtimes, 2)],
        [label("NuGet config", "NuGet 配置"), dotnet?.nugetConfigPath || t("state.notChecked")],
        [label("Current source", "当前源"), ["dotnet", "nuget"].includes(state.mirrorTarget) && state.mirrorCurrent ? state.mirrorCurrent : label("Inspect the allowlisted .NET/NuGet target below.", "请在下方检查受 allowlist 保护的 .NET/NuGet 目标。")],
      ], "toolchains-dotnet-ecosystem")}
    </div>
  </section>`;
}

function ecosystemCard(title: string, rows: Array<[string, string]>, testId: string): string {
  return `<article class="operation-card" data-testid="${escapeHtml(testId)}"><h3>${escapeHtml(title)}</h3>${renderRows(rows.map(([rowLabel, value]) => ({ label: rowLabel, value })))}</article>`;
}

function renderToolchainActions(state: ToolchainWorkbenchState): string {
  const action = selectedToolchainAction(state.toolchainActionId);
  const value = state.toolchainActionValue || defaultActionValue(action);
  return `<section class="panel" data-testid="toolchains-action-section">
    <div class="panel-head"><div><h2>${label("Allowlisted ecosystem actions", "受 allowlist 保护的生态操作")}</h2><p>${label("No arbitrary shell text is accepted. Every action maps to a fixed backend operation.", "不接受任意 Shell 文本；每个操作都映射到固定后端动作。")}</p></div></div>
    <div class="form-grid">
      <label>${label("Action", "操作")}<select id="toolchain-action" data-testid="toolchains-action-select">${toolchainActionDefinitions.map((item) => `<option value="${item.id}" ${item.id === action.id ? "selected" : ""}>${escapeHtml(`${item.ecosystem} - ${item.label}`)}</option>`).join("")}</select></label>
      ${action.valueLabel ? `<label>${escapeHtml(action.valueLabel)}${action.valueOptions ? `<select id="toolchain-action-value" data-testid="toolchains-action-value">${action.valueOptions.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>` : `<input id="toolchain-action-value" data-testid="toolchains-action-value" value="${escapeHtml(value)}" />`}</label>` : ""}
      ${action.secondaryLabel ? `<label>${escapeHtml(action.secondaryLabel)}<input id="toolchain-action-secondary" data-testid="toolchains-action-secondary" value="${escapeHtml(state.toolchainActionSecondary)}" /></label>` : ""}
    </div>
    <div data-testid="toolchains-action-preview">${renderRows([
      { label: label("Ecosystem", "生态"), value: action.ecosystem },
      { label: label("Action", "操作"), value: action.id },
      { label: label("Command preview", "命令预览"), value: action.commandPreview },
      { label: label("Read only", "只读"), value: action.readOnly ? label("Yes", "是") : label("No", "否") },
      { label: label("Risk", "风险"), value: action.riskLevel },
      { label: label("Timeout", "超时"), value: `${action.timeoutSeconds}s` },
    ])}</div>
    <div class="toolbar">${renderActionButton("execute-toolchain-action", action.readOnly ? label("Run diagnostic", "运行诊断") : label("Confirm and execute", "确认并执行"), action.readOnly ? "primary" : "danger")}</div>
    <div data-testid="toolchains-action-result">${state.toolchainOperationError ? `${renderRows([
      { label: "stdout", value: "" },
      { label: "stderr", value: state.toolchainOperationError },
      { label: label("Exit code", "退出码"), value: label("Unavailable - backend rejected or command did not complete", "不可用 - 后端拒绝或命令未完成") },
    ])}<div class="error-state" data-testid="toolchains-action-error">${escapeHtml(state.toolchainOperationError)}</div>` : state.toolchainOperationResult ? renderRows([
      { label: "stdout", value: state.toolchainOperationResult.message },
      { label: "stderr", value: "" },
      { label: label("Exit code", "退出码"), value: state.toolchainOperationResult.success ? "0" : label("Non-zero", "非零") },
      { label: label("Verification", "验证"), value: state.toolchainOperationVerification },
    ]) : `<div class="empty">${label("No ecosystem action has run.", "尚未运行生态操作。")}</div>`}</div>
  </section>`;
}

function renderMirrorCenter(state: ToolchainWorkbenchState): string {
  const targets = ["node", "python", "go", "rust", "cargo", "maven", "gradle", "nuget", "dotnet"];
  const sources = ["official", "npmmirror", "tuna", "aliyun", "ustc", "bfsu", "huawei", "tencent"];
  return `<section class="panel" data-testid="toolchains-mirrors-section">
    <div class="panel-head"><div><h2>${label("Mirror and registry center", "镜像与 Registry 中心")}</h2><p>${label("Inspect current and candidate sources before applying a backend-allowlisted change.", "应用后端 allowlist 变更前，先检查当前源和候选源。")}</p></div></div>
    <div class="form-grid">
      <label>${label("Target", "目标")}<select id="mirror-target" data-testid="toolchains-mirror-target">${targets.map((target) => `<option value="${target}" ${target === state.mirrorTarget ? "selected" : ""}>${target}</option>`).join("")}</select></label>
      <label>${label("Change", "变更")}<select id="mirror-action" data-testid="toolchains-mirror-action">${["set", "auto", "reset"].map((action) => `<option value="${action}" ${action === state.mirrorAction ? "selected" : ""}>${action}</option>`).join("")}</select></label>
      ${state.mirrorAction === "set" ? `<label>${label("Allowlisted source", "允许的源")}<select id="mirror-source" data-testid="toolchains-mirror-source">${sources.map((source) => `<option value="${source}" ${source === state.mirrorSource ? "selected" : ""}>${source}</option>`).join("")}</select></label>` : ""}
    </div>
    <div class="toolbar">${renderActionButton("inspect-mirror-current", label("Current source", "当前源"), "primary")}${renderActionButton("list-mirror-candidates", label("Candidate sources", "候选源"))}${renderActionButton("measure-mirror-candidates", label("Measure", "测速"))}</div>
    <div data-testid="toolchains-mirror-preview">${renderRows([
      { label: label("Target", "目标"), value: state.mirrorTarget },
      { label: label("Original/current source", "原值 / 当前源"), value: state.mirrorCurrent || t("state.notChecked") },
      { label: label("Planned action", "计划操作"), value: `${state.mirrorAction}${state.mirrorAction === "set" ? ` ${state.mirrorSource}` : ""}` },
      { label: label("Risk", "风险"), value: label("High - confirmation token required", "高风险 - 需要确认令牌") },
      { label: label("Rollback", "回滚"), value: label("Use reset or reapply an allowlisted original source after reviewing current-source output.", "查看当前源输出后，使用 reset 或重新应用允许的原始源。") },
    ])}</div>
    <div class="toolbar">${renderActionButton("execute-mirror-action", label("Confirm and apply", "确认并应用"), "danger")}</div>
    <div data-testid="toolchains-mirror-result">
      ${state.mirrorError ? `<div class="error-state" data-testid="toolchains-mirror-error">${escapeHtml(state.mirrorError)}</div>` : ""}
      ${state.mirrorResult ? renderObjectTable(state.mirrorResult, ["success", "message"]) : ""}
      ${state.mirrorVerification ? `<p class="small-note"><strong>${label("Verified current source", "验证后的当前源")}</strong><br>${escapeHtml(state.mirrorVerification)}</p>` : ""}
      ${state.mirrorCandidates ? `<h3>${label("Candidates", "候选源")}</h3><pre>${escapeHtml(state.mirrorCandidates)}</pre>` : ""}
      ${state.mirrorMeasure ? `<h3>${label("Measurement", "测速结果")}</h3><pre>${escapeHtml(state.mirrorMeasure)}</pre>` : ""}
      ${!state.mirrorError && !state.mirrorResult && !state.mirrorCandidates && !state.mirrorMeasure ? `<div class="empty">${label("No mirror action has run.", "尚未运行镜像操作。")}</div>` : ""}
    </div>
  </section>`;
}

function renderNetworkCache(state: ToolchainWorkbenchState): string {
  return `<section class="panel" data-testid="toolchains-network-cache-section">
    <div class="panel-head"><div><h2>${label("Network and managed download cache", "网络与受管下载缓存")}</h2><p>${label("Diagnostics and cache listing are read only. Cache deletion uses a separate token-gated preview.", "网络诊断和缓存列表为只读；缓存删除使用独立的令牌预览流程。")}</p></div></div>
    <div class="toolbar">${renderActionButton("inspect-network-diagnostics", label("Run network diagnostics", "运行网络诊断"), "primary")}${renderActionButton("inspect-download-cache", label("Inspect cache", "检查缓存"))}</div>
    ${state.networkCacheError ? `<div class="error-state" data-testid="toolchains-network-cache-error">${escapeHtml(state.networkCacheError)}</div>` : ""}
    <div data-testid="toolchains-network-result">${state.network?.checks.length ? `<div class="table-wrap"><table><thead><tr><th>${label("Target", "目标")}</th><th>${label("Status", "状态")}</th><th>${label("Latency", "耗时")}</th><th>${label("Source", "来源")}</th><th>${label("Risk", "风险")}</th></tr></thead><tbody>${state.network.checks.map((check) => `<tr><td>${escapeHtml(check.name)}<br><small>${escapeHtml(check.url)}</small></td><td>${check.success ? label("Reachable", "可访问") : escapeHtml(check.status)}</td><td>${check.elapsedMs}ms</td><td>network_diagnostics</td><td>readOnly</td></tr>`).join("")}</tbody></table></div>${renderRows(state.network.proxy.map(([name, value]) => ({ label: name, value })))}` : state.network ? `<div class="empty">${label("Diagnostics completed without endpoint results. Review proxy and backend logs.", "诊断已完成但没有端点结果，请检查代理和后端日志。")}</div>` : `<div class="empty">${label("Network diagnostics have not run.", "尚未运行网络诊断。")}</div>`}</div>
    <div data-testid="toolchains-cache-result">${state.cacheEntries.length ? `<div class="table-wrap"><table><thead><tr><th>${label("File", "文件")}</th><th>${label("Size", "大小")}</th><th>SHA256</th><th>${label("Source", "来源")}</th><th>${label("Risk", "风险")}</th><th>${label("Actions", "操作")}</th></tr></thead><tbody>${state.cacheEntries.map((entry) => `<tr data-testid="toolchains-cache-row"><td>${escapeHtml(entry.name)}<br><small>${escapeHtml(entry.path)}</small></td><td>${formatBytes(entry.size)}</td><td>${escapeHtml(entry.sha256 || label("Not calculated", "未计算"))}</td><td>DevEnv Manager managed downloads</td><td>readOnly</td><td><button type="button" data-cache-open="${escapeHtml(entry.path)}" data-testid="toolchains-cache-open">${label("Open", "打开")}</button><button type="button" data-cache-copy="${escapeHtml(entry.path)}" data-testid="toolchains-cache-copy">${label("Copy", "复制")}</button></td></tr>`).join("")}</tbody></table></div>` : state.cacheInspected ? `<div class="empty">${label("The managed download cache is empty.", "受管下载缓存为空。")}</div>` : `<div class="empty">${label("No managed cache entries loaded. Run cache inspection.", "尚未加载受管缓存，请先检查缓存。")}</div>`}</div>
    <div data-testid="toolchains-cache-clear-preview">${renderRows([
      { label: label("Target", "目标"), value: label("DevEnv Manager managed download cache only", "仅 DevEnv Manager 受管下载缓存") },
      { label: label("Entries currently listed", "当前条目数"), value: String(state.cacheEntries.length) },
      { label: label("Risk", "风险"), value: label("High - files will be deleted after token confirmation", "高风险 - 令牌确认后删除文件") },
      { label: label("Verification", "验证"), value: label("Re-list cache entries after execution", "执行后重新读取缓存列表") },
    ])}</div>
    <div class="toolbar">${renderActionButton("clear-toolchain-cache", label("Confirm and clear managed cache", "确认并清理受管缓存"), "danger")}</div>
    <div data-testid="toolchains-cache-operation-result">${state.cacheOperationResult ? `<div class="small-note">${escapeHtml(state.cacheOperationResult)}</div>` : `<div class="empty">${label("No cache operation has run.", "尚未执行缓存操作。")}</div>`}</div>
  </section>`;
}

function toolState(tool: { installed: boolean; version: string; path: string; detail: string } | undefined): string {
  if (!tool) return t("state.notChecked");
  if (!tool.installed) return label("Not installed", "未安装");
  return [tool.version, tool.path, tool.detail].filter(Boolean).join(" - ");
}

function toolRows(tools: Array<{ name: string; installed: boolean; version: string; path: string; detail: string }> | undefined): Array<[string, string]> {
  if (!tools?.length) return [[label("Tools", "工具"), t("state.notChecked")]];
  return tools.map((tool) => [tool.name, tool.installed ? [tool.version, tool.path].filter(Boolean).join(" - ") : label("Not installed", "未安装")]);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function summarizeList(values: string[] | undefined, limit = 4): string {
  if (!values?.length) return t("state.notChecked");
  const visible = values.slice(0, limit).join("; ");
  return values.length > limit ? `${visible}; +${values.length - limit} more` : visible;
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
