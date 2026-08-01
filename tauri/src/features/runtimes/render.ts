import { escapeHtml, renderActionButton, renderMetric, renderObjectTable } from "../sharedView";
import { localize, t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { RuntimeWorkbenchState } from "./state";
import { toRuntimeViewModel, type RuntimeGroupViewModel, type RuntimeRowViewModel } from "./viewModel";

const runtimeGroupTestIds: Record<string, string> = {
  java: "runtime-group-java",
  python: "runtime-group-python",
  node: "runtime-group-node",
  go: "runtime-group-go",
  maven: "runtime-group-maven",
  gradle: "runtime-group-gradle",
  rust: "runtime-group-rust",
  dotnet: "runtime-group-dotnet",
  other: "runtime-group-other",
};

export function renderRuntimeWorkbench(state: RuntimeWorkbenchState): string {
  const vm = toRuntimeViewModel(state);
  return `
    <div class="feature-layout" data-testid="runtime-page">
      <section class="panel" data-testid="runtime-overview-section">
        <div class="panel-head"><div><h2>${t("route.runtimes.label")}</h2><p>${t("feature.runtimes.description")}</p></div></div>
        ${renderFeatureGuide("runtimes")}
        <div class="metrics">
          ${renderMetric(t("feature.runtimes.installed"), vm.rows.filter((row) => row.managed).length)}
          ${renderMetric(localize("External discoveries", "外部发现"), vm.rows.filter((row) => !row.managed).length)}
          ${renderMetric(t("feature.runtimes.verification"), vm.verification, vm.verificationDetail)}
        </div>
        <div class="toolbar" data-testid="runtime-install-section">
          ${renderActionButton("refresh-runtimes", t("feature.runtimes.discover"), "primary")}
          ${renderActionButton("verify-runtimes", t("feature.runtimes.healthCheck"))}
          ${renderActionButton("export-runtime-report", localize("Export verification report", "导出验证报告"))}
        </div>
        ${renderRuntimeOperationResult(state)}
        ${renderRuntimeHealthSummary(state)}
      </section>
      ${renderRuntimeSwitchWorkflow(state)}
      <div class="runtime-groups" data-testid="runtime-installed-list">
        ${vm.groups.map((group) => renderRuntimeGroup(group, state)).join("")}
      </div>
      ${renderRuntimeDetails(vm.rows.find((row) => row.id === state.selectedRuntimeId) ?? null)}
    </div>
  `;
}

function renderRuntimeGroup(group: RuntimeGroupViewModel, state: RuntimeWorkbenchState): string {
  const current = group.current.map((runtime) => `${runtime.kind} ${runtime.version} (${runtime.managed ? localize("managed", "受管") : localize("external", "外部")})`).join(", ");
  return `<section class="panel runtime-group" data-testid="${runtimeGroupTestIds[group.id] ?? "runtime-group-other"}">
    <div class="panel-head runtime-group__head">
      <div>
        <h2>${escapeHtml(group.label)}</h2>
        <p>${current ? `${localize("Current effective", "当前生效")}: ${escapeHtml(current)}` : localize("No effective runtime detected for this ecosystem.", "此生态尚未检测到当前生效运行时。")}</p>
      </div>
    </div>
    ${renderInstallControl(group.id, state)}
    ${group.id === "java" ? renderExternalJdkPanel(state, group.external) : ""}
    <div class="runtime-group__sections">
      <div class="runtime-section" data-testid="runtime-group-${escapeHtml(group.id)}-managed">
        <h3>${localize("Managed versions", "受管版本")}</h3>
        <p class="small-note">${localize("Only these versions can be switched or uninstalled by DevEnv Manager.", "只有这些版本可以由 DevEnv Manager 切换或卸载。")}</p>
        <div class="runtime-list">${group.managed.map((runtime) => renderRuntimeRow(runtime, state)).join("") || `<div class="empty">${localize("No managed version installed.", "尚未安装受管版本。")}</div>`}</div>
      </div>
      <div class="runtime-section" data-testid="runtime-group-${escapeHtml(group.id)}-external">
        <h3>${localize("External discoveries", "外部发现版本")}</h3>
        <p class="small-note">${localize("External installations stay read-only. DevEnv Manager never deletes their directories.", "外部安装保持只读，DevEnv Manager 不会删除其目录。")}</p>
        <div class="runtime-list">${group.external.map((runtime) => renderRuntimeRow(runtime, state)).join("") || `<div class="empty">${localize("No external runtime discovered.", "尚未发现外部运行时。")}</div>`}</div>
      </div>
    </div>
  </section>`;
}

function renderInstallControl(groupId: string, state: RuntimeWorkbenchState): string {
  if (groupId === "java") {
    return `<div class="runtime-install-card" data-testid="runtime-install-jdk-group">
      <div><strong>${localize("Install managed JDK", "安装受管 JDK")}</strong><span>${localize("Installation verifies files and commands but never switches current automatically.", "安装会验证文件和命令，但绝不会自动切换当前版本。")}</span></div>
      <div class="runtime-install-controls">
        <select id="jdk-distribution" data-testid="runtime-jdk-distribution-select">${state.distributions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.recommended ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("") || `<option value="temurin">Temurin</option>`}</select>
        <select id="jdk-version" data-testid="runtime-jdk-version-select">${["8", "11", "17", "21", "25"].map((version) => `<option value="${version}" ${version === "21" ? "selected" : ""}>JDK ${version}</option>`).join("")}</select>
        ${renderActionButton("install-jdk", t("feature.runtimes.installJdk"))}
      </div>
    </div>`;
  }
  if (groupId === "node") return renderVersionInstallControl("Node.js", "runtime-install-node-group", "node-version", "runtime-node-version-select", ["16", "18", "20", "22", "24"], "22", "install-node", t("feature.runtimes.installNode"));
  if (groupId === "python") return renderVersionInstallControl("Python", "runtime-install-python-group", "python-version", "runtime-python-version-select", ["3.9", "3.10", "3.11", "3.12", "3.13", "3.14"], "3.12", "install-python", t("feature.runtimes.installPython"));
  if (groupId === "go") return renderVersionInstallControl("Go", "runtime-install-go-group", "go-version", "runtime-go-version-select", ["1.22", "1.23", "1.24", "1.25", "1.26"], "1.25", "install-go", t("feature.runtimes.installGo"));
  if (groupId === "maven") return renderVersionInstallControl("Maven", "runtime-install-maven-group", "maven-version", "runtime-maven-version-select", ["latest", "3.9.16", "3.9.15", "3.9.14", "3.9.12", "3.9.11"], "latest", "install-maven", t("feature.runtimes.installMaven"));
  if (groupId === "gradle") return renderVersionInstallControl("Gradle", "runtime-install-gradle-group", "gradle-version", "runtime-gradle-version-select", ["latest", "9.6.1", "9.5.0", "9.4.0", "8.14.3"], "latest", "install-gradle", t("feature.runtimes.installGradle"));
  return `<div class="runtime-readonly-note">${localize("Read-only discovery. Use the vendor tool or Windows package manager to install and update this ecosystem.", "此生态仅提供只读发现；请使用厂商工具或 Windows 包管理器安装和更新。")}</div>`;
}

function renderVersionInstallControl(title: string, testId: string, selectId: string, selectTestId: string, versions: string[], selected: string, action: string, label: string): string {
  return `<div class="runtime-install-card" data-testid="${escapeHtml(testId)}">
    <div><strong>${localize(`Install managed ${title}`, `安装受管 ${title}`)}</strong><span>${localize("Verified after installation; current remains unchanged.", "安装后强校验；当前版本保持不变。")}</span></div>
    <div class="runtime-install-controls">
      <select id="${escapeHtml(selectId)}" data-testid="${escapeHtml(selectTestId)}">${versions.map((version) => `<option value="${version}" ${version === selected ? "selected" : ""}>${escapeHtml(title)} ${version}</option>`).join("")}</select>
      ${renderActionButton(action, label)}
    </div>
  </div>`;
}

function renderExternalJdkPanel(state: RuntimeWorkbenchState, candidates: RuntimeRowViewModel[]): string {
  const checks = state.externalJdkChecks;
  const java = checks.find((check) => check.id === "java-version");
  const javac = checks.find((check) => check.id === "javac-version");
  const jar = checks.find((check) => check.id === "jar-version");
  const classification = checks.length ? (java?.success && javac?.success && jar?.success ? localize("Full JDK", "完整 JDK") : java?.success ? localize("JRE/incomplete JDK", "JRE 或不完整 JDK") : localize("Not usable", "不可用")) : t("state.notChecked");
  return `<div class="runtime-external-verification" data-testid="runtime-external-jdk-section">
    <h3>${localize("Verify an external JDK", "验证外部 JDK")}</h3>
    <div class="form-grid">
      <select id="external-jdk-candidate" data-testid="runtime-external-jdk-select">
        <option value="">${localize("Select a discovered external JDK", "选择已发现的外部 JDK")}</option>
        ${candidates.filter((candidate) => candidate.backendKind === "jdk").map((candidate) => `<option value="${escapeHtml(candidate.runtimeRoot)}" ${state.externalJdkPath === candidate.runtimeRoot ? "selected" : ""}>${escapeHtml(candidate.version)} - ${escapeHtml(candidate.source)} - ${escapeHtml(candidate.runtimeRoot)}</option>`).join("")}
        ${state.externalJdkPath && !candidates.some((candidate) => candidate.runtimeRoot === state.externalJdkPath) ? `<option value="${escapeHtml(state.externalJdkPath)}" selected>${escapeHtml(state.externalJdkPath)}</option>` : ""}
      </select>
      <input id="external-jdk-path" value="${escapeHtml(state.externalJdkPath)}" readonly placeholder="${localize("Select or choose a JDK root", "选择或浏览 JDK 根目录")}" />
    </div>
    <div class="toolbar">
      ${renderActionButton("choose-external-jdk", localize("Choose JDK root", "选择 JDK 根目录"))}
      ${renderActionButton("verify-external-jdk", localize("Verify java, javac, and jar", "验证 java、javac 和 jar"), "primary")}
    </div>
    <div data-testid="runtime-external-jdk-result">
      ${state.externalJdkError ? `<div class="error-state">${escapeHtml(state.externalJdkError)}</div>` : ""}
      ${checks.length ? `<dl class="kv-list">
        <div><dt>${localize("Classification", "分类")}</dt><dd>${escapeHtml(classification)}</dd></div>
        <div><dt>${localize("Suggested JAVA_HOME", "建议的 JAVA_HOME")}</dt><dd>${escapeHtml(state.externalJdkPath)}</dd></div>
        <div><dt>${localize("java executable", "java 可执行文件")}</dt><dd>${escapeHtml(`${state.externalJdkPath}\\bin\\java.exe`)}</dd></div>
        <div><dt>${localize("javac executable", "javac 可执行文件")}</dt><dd>${escapeHtml(`${state.externalJdkPath}\\bin\\javac.exe`)}</dd></div>
        <div><dt>${localize("jar executable", "jar 可执行文件")}</dt><dd>${escapeHtml(`${state.externalJdkPath}\\bin\\jar.exe`)}</dd></div>
        ${checks.map((check) => `<div><dt>${escapeHtml(check.title)}</dt><dd>${check.success ? localize("PASS", "通过") : localize("FAIL", "失败")} - ${escapeHtml(check.detail)}</dd></div>`).join("")}
      </dl>` : `<div class="empty">${localize("No external JDK has been verified.", "尚未验证外部 JDK。")}</div>`}
      ${state.externalJdkResult ? `<div class="small-note">${escapeHtml(state.externalJdkResult)}</div>` : ""}
    </div>
  </div>`;
}

function renderRuntimeOperationResult(state: RuntimeWorkbenchState): string {
  return `<div data-testid="runtime-operation-result">
    ${state.operationError ? `<div class="error-state" data-testid="runtime-operation-error">${escapeHtml(state.operationError)}</div>` : ""}
    ${state.operationResult ? `<div class="small-note">${escapeHtml(state.operationResult)}</div>` : `<div class="empty">${t("state.notChecked")}</div>`}
  </div>`;
}

function renderRuntimeHealthSummary(state: RuntimeWorkbenchState): string {
  const report = state.strongVerification;
  if (!report) return "";
  const rows = report.items.map((item) => {
    const required = item.checks.filter((check) => check.required);
    const failed = required.filter((check) => check.status === "failed");
    const skipped = required.filter((check) => check.status === "skipped");
    const healthy = required.length > 0 && failed.length === 0 && skipped.length === 0;
    const status = healthy
      ? localize("Healthy", "健康")
      : failed.length
        ? localize("Needs attention", "需要处理")
        : localize("Verification incomplete", "验证未完成");
    return `<tr>
      <td>${escapeHtml(`${item.kind} ${item.version}`)}</td>
      <td>${renderStatus(status, healthy ? "success" : failed.length ? "danger" : "warning")}</td>
      <td>${required.filter((check) => check.status === "passed").length}/${required.length}</td>
      <td>${escapeHtml(failed.map((check) => check.label).join("; ") || skipped.map((check) => check.label).join("; ") || localize("All required checks passed", "所有必需检查均已通过"))}</td>
    </tr>`;
  });
  const healthyCount = report.items.filter((item) => {
    const required = item.checks.filter((check) => check.required);
    return required.length > 0 && required.every((check) => check.status === "passed");
  }).length;
  return `<section class="operation-summary" data-testid="runtime-health-summary" aria-live="polite">
    <div class="panel-head"><div><h3>${localize("Health check result", "健康检查结果")}</h3><p>${escapeHtml(localize(`${healthyCount}/${report.items.length} runtimes passed all required checks.`, `${healthyCount}/${report.items.length} 个运行时通过全部必需检查。`))}</p></div></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>${localize("Runtime", "运行时")}</th><th>${localize("Result", "结果")}</th><th>${localize("Required checks", "必需检查")}</th><th>${localize("Details", "详情")}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>` : `<div class="empty">${localize("No runtime was available to verify.", "没有可验证的运行时。")}</div>`}
  </section>`;
}

function renderStatus(label: string, tone: "success" | "warning" | "danger"): string {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
}

function renderRuntimeSwitchWorkflow(state: RuntimeWorkbenchState): string {
  const status = runtimeSwitchStatus(state);
  return `<section class="panel" data-testid="runtime-switch-workflow" tabindex="-1">
    <div class="panel-head"><div><h2>${localize("Runtime switch plan", "运行时切换计划")}</h2><p>${localize("Select Set as current on an eligible managed, external, provider-managed or project runtime. Review the backup and exact adapter changes before execution.", "在符合条件的受管、外部、提供方管理或项目运行时上选择“设为当前”；执行前审阅备份和适配器的准确变更。")}</p></div></div>
    <div class="runtime-switch-status ${state.switchPhase === "failed" ? "error-state" : "small-note"}" data-testid="runtime-switch-plan-status" aria-live="polite">
      <strong data-testid="runtime-switch-target">${escapeHtml(state.switchTargetLabel || localize("No target selected", "尚未选择目标"))}</strong>
      <code data-testid="runtime-switch-target-root">${escapeHtml(state.switchTargetRoot || localize("Target path not selected", "尚未选择目标路径"))}</code>
      <span>${escapeHtml(status)}</span>
    </div>
    ${state.switchPhase === "planReady" ? `<div class="small-note" data-testid="runtime-switch-plan-created">${escapeHtml(state.switchInlineMessage)}</div>` : ""}
    ${state.switchInlineError ? `<div class="error-state" data-testid="runtime-switch-plan-error"><strong data-testid="runtime-switch-failure-stage">${escapeHtml(state.switchFailureStage === "execution" ? localize("Execution / verification failed", "执行 / 验证失败") : localize("Plan creation failed", "计划创建失败"))}:</strong> ${escapeHtml(state.switchInlineError)}</div>` : ""}
    ${state.switchNextStep ? `<div class="small-note" data-testid="runtime-switch-next-step"><strong>${localize("Next step", "下一步")}:</strong> ${escapeHtml(state.switchNextStep)}</div>` : ""}
    ${state.switchTargetMode === "project" ? `<div class="form-grid" data-testid="runtime-project-switch-section">
      <label>${localize(".NET project directory", ".NET 项目目录")}<input value="${escapeHtml(state.runtimeProjectRoot)}" data-testid="runtime-project-root" readonly placeholder="${localize("Choose the directory that owns global.json", "选择需要写入 global.json 的项目目录")}" /></label>
      <button class="button button--secondary secondary" data-action="choose-runtime-project" data-testid="runtime-project-root-choose" type="button">${escapeHtml(localize("Choose project directory", "选择项目目录"))}</button>
    </div>` : ""}
    ${renderRuntimeSwitchBackupPicker(state)}
    <div data-testid="runtime-switch-plan-preview" tabindex="-1">
      ${state.switchPlan ? renderObjectTable(state.switchPlan, ["runtimeId", "switchMode", "sourceAuthority", "provider", "kind", "version", "targetRoot", "previousVersion", "previousRoot", "environmentChanges", "pathDiff", "backupName", "backupId", "backupPath", "verificationSteps", "warnings", "createdAt", "expiresAt", "planId"]) : `<div class="empty">${localize("No runtime switch plan.", "尚未创建运行时切换计划。")}</div>`}
      <div class="toolbar runtime-switch-toolbar">
        <button class="button button--secondary secondary" data-action="view-runtime-switch-diff" data-testid="runtime-switch-plan-view-diff" type="button" ${state.switchPlan ? "" : "disabled"}>${escapeHtml(localize("View environment diff", "查看环境差异"))}</button>
        <button class="button button--secondary secondary" data-action="export-runtime-switch-plan" data-testid="runtime-switch-plan-export" type="button" ${state.switchPlan ? "" : "disabled"}>${escapeHtml(localize("Export plan", "导出计划"))}</button>
        <button class="button button--secondary secondary" data-action="recreate-runtime-switch-plan" data-testid="runtime-switch-plan-recreate" type="button" ${state.switchTargetRuntimeId && state.switchPhase !== "planning" && state.switchPhase !== "executing" ? "" : "disabled"}>${escapeHtml(localize("Recreate plan", "重新创建计划"))}</button>
        <button class="button button--secondary secondary" data-action="cancel-runtime-switch-plan" data-testid="runtime-switch-plan-cancel" type="button" ${state.switchPlan && state.switchPhase !== "executing" ? "" : "disabled"}>${escapeHtml(localize("Cancel plan", "取消计划"))}</button>
        <button class="button button--secondary secondary" data-action="restore-runtime-switch-backup" data-testid="runtime-switch-backup-restore" type="button" ${state.switchBackupId ? "" : "disabled"}>${escapeHtml(localize("Restore switch backup", "恢复切换备份"))}</button>
        <button class="button button--danger danger" data-action="execute-runtime-switch-plan" data-testid="runtime-switch-plan-execute" type="button" ${state.switchPlan && state.switchPhase !== "executing" ? "" : "disabled"}>${escapeHtml(localize("Execute reviewed switch plan", "执行已审阅的切换计划"))}</button>
      </div>
    </div>
    <div data-testid="runtime-switch-result">
      ${state.switchResult ? `${renderObjectTable(state.switchResult, ["success", "message", "planId", "backupName", "backupId", "backupPath", "selectionScope", "userEnvironmentWritten", "currentProcessUnchanged", "newChildProcessVerified", "restartRequired", "rollbackPerformed", "rollbackVerified"])}<div class="small-note">${escapeHtml(localize("The saved user/provider/project state and a newly launched command were verified separately. The already-running DevEnv Manager process keeps its original environment until restart.", "已分别验证保存的用户/提供方/项目状态和新启动命令；当前正在运行的 DevEnv Manager 进程会保留原环境，直至重启。"))}</div>${renderVerificationChecks(state.switchResult.verification.checks)}` : `<div class="empty">${localize("No switch has been executed.", "尚未执行切换。")}</div>`}
    </div>
  </section>`;
}

function renderRuntimeSwitchBackupPicker(state: RuntimeWorkbenchState): string {
  const invalidCount = state.switchBackups.filter((backup) => !backup.restorable).length;
  const options = state.switchBackups
    .filter((backup) => backup.restorable)
    .map((backup) => {
      const label = `${backup.targetKind} ${backup.targetVersion} - ${backup.switchMode} - ${backup.createdAt}`;
      return `<option value="${escapeHtml(backup.backupId)}" ${backup.backupId === state.switchBackupId ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
  return `<div class="form-grid runtime-switch-backup-picker" data-testid="runtime-switch-backup-section">
    <label>${escapeHtml(localize("Verified recovery backup", "已验证的恢复备份"))}
      <select id="runtime-switch-backup" data-testid="runtime-switch-backup-select">
        <option value="">${escapeHtml(localize("No backup selected", "尚未选择备份"))}</option>
        ${options}
      </select>
    </label>
    <div class="small-note" data-testid="runtime-switch-backup-detail">${escapeHtml(
      state.switchBackupPath
      || localize("Verified switch backups will remain selectable after restarting the app.", "经过验证的切换备份在应用重启后仍可选择。"),
    )}</div>
    ${invalidCount ? `<div class="error-state" data-testid="runtime-switch-backup-invalid">${escapeHtml(localize(`${invalidCount} backup record(s) failed integrity validation and cannot be restored.`, `${invalidCount} 个备份记录未通过完整性校验，无法恢复。`))}</div>` : ""}
  </div>`;
}

function renderRuntimeRow(runtime: RuntimeRowViewModel, state: RuntimeWorkbenchState): string {
  const isSwitchTarget = state.switchTargetRuntimeId === runtime.id;
  return `<article class="runtime ${runtime.current ? "runtime--current" : ""} ${isSwitchTarget ? "runtime--switch-target" : ""}" data-runtime-row="${escapeHtml(runtime.id)}" data-testid="runtime-row">
    <div><strong>${escapeHtml(runtime.kind)} ${escapeHtml(runtime.version)}</strong><span>${escapeHtml(runtime.currentLabel)}</span></div>
    <small>${escapeHtml(runtime.runtimeRoot)}<br>${t("feature.runtimes.source")}: ${escapeHtml(runtime.source)} - ${escapeHtml(runtime.status)}</small>
    ${isSwitchTarget && (state.switchInlineMessage || state.switchInlineError) ? `<div class="${state.switchInlineError ? "error-state" : "small-note"}" data-testid="runtime-row-switch-status" aria-live="polite">${escapeHtml(state.switchInlineError || state.switchInlineMessage)}</div>` : ""}
    <div class="row-actions">${runtime.managed ? renderManagedActions(runtime, state) : renderExternalActions(runtime, state)}</div>
  </article>`;
}

function renderManagedActions(runtime: RuntimeRowViewModel, state: RuntimeWorkbenchState): string {
  const busy = state.switchPhase === "planning" || state.switchPhase === "executing";
  const switchLabel = runtime.current ? localize("Current effective", "当前已生效") : localize("Set as current", "设为当前");
  return `<span class="status-badge status-badge--success">${escapeHtml(runtime.readonlyLabel)}</span>${runtimeAction("details", runtime, t("feature.runtimes.details"))}${runtimeAction("health", runtime, t("feature.runtimes.healthCheck"))}${runtimeAction("open", runtime, t("feature.runtimes.openDir"))}${runtimeAction("copy", runtime, t("feature.runtimes.copyPath"))}${runtimeAction("switch", runtime, switchLabel, "secondary", busy || runtime.current, runtime.current ? "runtime-current-effective" : "runtime-managed-set-current")}${runtimeAction("uninstall", runtime, t("feature.runtimes.uninstall"), "danger")}`;
}

function renderExternalActions(runtime: RuntimeRowViewModel, state: RuntimeWorkbenchState): string {
  const busy = state.switchPhase === "planning" || state.switchPhase === "executing";
  const adopt = runtime.current
    ? runtimeAction("switch", runtime, localize("Current effective", "当前已生效"), "secondary", true, "runtime-current-effective")
    : runtime.switchEligible && runtime.switchMode
      ? runtimeAction("switch", runtime, externalSwitchLabel(runtime), "primary", busy, "runtime-external-set-current")
      : `<button class="button button--secondary secondary" data-testid="runtime-external-switch-disabled" type="button" disabled>${escapeHtml(localize("Cannot set current", "无法设为当前"))}</button><span class="small-note" data-testid="runtime-external-switch-blocker">${escapeHtml(runtime.switchReason || localize("Read-only discovery; this runtime cannot be adopted safely.", "只读发现；无法安全采用此运行时。"))}</span>`;
  return `<span class="status-badge">${escapeHtml(runtime.readonlyLabel)}</span>${runtimeAction("details", runtime, t("feature.runtimes.details"))}${runtimeAction("health", runtime, localize("Reverify", "重新验证"))}${runtimeAction("open", runtime, t("feature.runtimes.openDir"))}${runtimeAction("copy", runtime, t("feature.runtimes.copyPath"))}${adopt}${runtimeAction("system", runtime, t("feature.runtimes.systemUninstall"))}`;
}

function externalSwitchLabel(runtime: RuntimeRowViewModel): string {
  if (runtime.switchMode === "provider") {
    if (runtime.provider === "rustup") return localize("Set default through rustup", "通过 rustup 设为默认");
    if (runtime.provider === "nvm") return localize("Switch through nvm", "通过 nvm 切换");
    if (runtime.provider === "fnm") return localize("Switch through fnm", "通过 fnm 切换");
    if (runtime.provider === "volta") return localize("Switch through Volta", "通过 Volta 切换");
    if (runtime.provider === "scoop") return localize("Switch through Scoop", "通过 Scoop 切换");
  }
  if (runtime.switchMode === "project") {
    return localize("Select for project", "用于项目");
  }
  return localize("Use in current user environment", "用于当前用户环境");
}

function runtimeAction(action: "copy" | "switch" | "uninstall" | "open" | "health" | "details" | "system", runtime: RuntimeRowViewModel, label: string, tone = "secondary", disabled = false, testId = ""): string {
  return `<button class="button button--${tone} ${tone}" data-runtime-action="${action}" data-runtime-id="${escapeHtml(runtime.id)}" data-runtime-switch-mode="${escapeHtml(runtime.switchMode || "")}" data-runtime-kind="${escapeHtml(runtime.backendKind)}" data-runtime-label="${escapeHtml(runtime.kind)}" data-runtime-version="${escapeHtml(runtime.version)}" data-runtime-path="${escapeHtml(runtime.runtimeRoot)}" data-runtime-executable="${escapeHtml(runtime.executable)}" ${testId ? `data-testid="${escapeHtml(testId)}"` : ""} type="button" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
}

function runtimeSwitchStatus(state: RuntimeWorkbenchState): string {
  if (state.switchPhase === "planning") return localize("Creating a trusted switch plan...", "正在创建可信切换计划...");
  if (state.switchPhase === "planReady") return localize("Plan ready for review.", "计划已创建，等待审阅。");
  if (state.switchPhase === "executing") return localize("Executing and verifying the selected runtime...", "正在执行并验证所选运行时...");
  if (state.switchPhase === "succeeded") return localize("Switch completed and verified.", "切换已完成并通过验证。");
  if (state.switchPhase === "failed") return localize("The switch workflow failed. Review the persistent error below.", "切换流程失败，请查看下方持久错误。");
  return localize("Choose an eligible runtime to create a plan.", "请选择可采用的运行时来创建计划。");
}

function renderRuntimeDetails(runtime: RuntimeRowViewModel | null): string {
  if (!runtime) return "";
  return `<section class="panel runtime-detail-panel" data-testid="runtime-detail-panel">
    <div class="panel-head"><div><h2>${t("feature.runtimes.details")}</h2><p>${escapeHtml(runtime.kind)} ${escapeHtml(runtime.version)}</p></div></div>
    <dl class="kv-list">
      <div><dt>${t("feature.runtimes.kind")}</dt><dd>${escapeHtml(runtime.kind)}</dd></div>
      <div><dt>${t("feature.runtimes.version")}</dt><dd>${escapeHtml(runtime.version)}</dd></div>
      <div><dt>${t("feature.runtimes.source")}</dt><dd>${escapeHtml(runtime.source)}</dd></div>
      <div><dt>${localize("Source authority", "来源权限")}</dt><dd>${escapeHtml(runtime.sourceAuthority)}</dd></div>
      <div><dt>${localize("Provider", "提供方")}</dt><dd>${escapeHtml(runtime.provider || localize("Direct environment selection", "直接环境选择"))}</dd></div>
      <div><dt>${localize("Adoption eligibility", "采用资格")}</dt><dd>${escapeHtml(runtime.switchEligible ? localize("Eligible after verification", "验证后可采用") : runtime.switchReason || localize("Read-only", "只读"))}</dd></div>
      <div><dt>${t("feature.runtimes.status")}</dt><dd>${escapeHtml(runtime.status)}</dd></div>
      <div><dt>${t("feature.runtimes.current")}</dt><dd>${escapeHtml(runtime.currentLabel)}</dd></div>
      <div><dt>${localize("Installed at", "安装时间")}</dt><dd>${escapeHtml(runtime.installedAt)}</dd></div>
      <div><dt>${t("feature.runtimes.root")}</dt><dd>${escapeHtml(runtime.runtimeRoot)}</dd></div>
      <div><dt>${t("feature.runtimes.executable")}</dt><dd>${escapeHtml(runtime.executable)}</dd></div>
    </dl>
    ${runtime.checks.length ? renderVerificationChecks(runtime.checks) : `<div class="empty">${localize("Run a health check to populate command-level verification.", "运行健康检查以显示命令级验证结果。")}</div>`}
  </section>`;
}

function renderVerificationChecks(checks: RuntimeRowViewModel["checks"]): string {
  return `<div class="table-wrap runtime-verification-table" data-testid="runtime-verification-result"><table><thead><tr><th>${localize("Check", "检查")}</th><th>${localize("Status", "状态")}</th><th>${localize("Expected", "预期")}</th><th>${localize("Actual / error", "实际 / 错误")}</th><th>${localize("Time", "耗时")}</th><th>${localize("Next step", "下一步")}</th></tr></thead><tbody>${checks.map((check) => `<tr><td><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.command)}</small></td><td><span class="status-badge ${check.status === "passed" ? "status-badge--success" : check.status === "failed" ? "status-badge--danger" : ""}">${escapeHtml(check.status)}</span></td><td>${escapeHtml(check.expected || "-")}</td><td>${escapeHtml(check.error || check.actual || "-")}</td><td>${check.elapsedMs} ms</td><td>${escapeHtml(check.suggestion)}</td></tr>`).join("")}</tbody></table></div>`;
}
