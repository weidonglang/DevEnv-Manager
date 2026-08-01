import type { FeatureContext } from "../app/featureContext";
import { finishDebug, logDebug } from "../core/debugLog";
import { localize, t } from "../core/i18n";
import { localizeBackendText } from "../core/backendText";

export type SafeResult<T> = { ok: true; value: T } | { ok: false; error: string };

const objectFieldLabels: Record<string, readonly [string, string]> = {
  actions: ["Actions", "操作"],
  afterScore: ["Score after repair", "修复后评分"],
  allowed: ["Allowed", "是否允许"],
  applied: ["Applied", "已应用"],
  backupId: ["Backup ID", "备份 ID"],
  backupHistoryId: ["Backup history ID", "备份历史 ID"],
  backupName: ["Backup name", "备份名称"],
  backupPath: ["Backup path", "备份路径"],
  beforeScore: ["Score before repair", "修复前评分"],
  command: ["Command", "命令"],
  commandLine: ["Command line", "命令行"],
  commands: ["Commands", "命令"],
  createdAt: ["Created at", "创建时间"],
  disclaimer: ["Safety notice", "安全说明"],
  elapsedMs: ["Elapsed time (ms)", "耗时（毫秒）"],
  elevated: ["Administrator", "管理员权限"],
  estimatedBytes: ["Estimated size", "预计大小"],
  environmentChanges: ["Environment changes", "环境变更"],
  executable: ["Executable", "可执行文件"],
  exitCode: ["Exit code", "退出码"],
  exportedAt: ["Exported at", "导出时间"],
  extensions: ["Extensions", "扩展名"],
  finishedAt: ["Finished at", "完成时间"],
  itemCount: ["Item count", "项目数量"],
  historyId: ["History ID", "历史 ID"],
  kind: ["Kind", "类型"],
  junctionCreated: ["Junction created", "已创建 Junction"],
  manualSelectionRequired: ["Manual selection required", "需要手动选择"],
  matchedDisplayName: ["Matched application", "匹配的应用"],
  message: ["Message", "消息"],
  missingRequirements: ["Missing requirements", "缺少的依赖"],
  mode: ["Mode", "模式"],
  nextStep: ["Next step", "下一步"],
  normalizedQuery: ["Normalized query", "规范化查询"],
  parentPid: ["Parent PID", "父进程 PID"],
  parentProcessName: ["Parent process", "父进程"],
  pathAdded: ["PATH entry added", "已添加 PATH 项"],
  pid: ["PID", "PID"],
  pidExited: ["Process exited", "进程已退出"],
  planFingerprint: ["Plan fingerprint", "计划指纹"],
  planId: ["Plan ID", "计划 ID"],
  port: ["Port", "端口"],
  portReleased: ["Port released", "端口已释放"],
  previewId: ["Preview ID", "预览 ID"],
  processName: ["Process name", "进程名称"],
  processPath: ["Process path", "进程路径"],
  profileId: ["Profile ID", "配置档案 ID"],
  profileCount: ["Profile count", "配置档案数量"],
  profileName: ["Profile name", "配置档案名称"],
  profiles: ["Profiles", "配置档案"],
  protocol: ["Protocol", "协议"],
  pythonPath: ["Python path", "Python 路径"],
  query: ["Query", "查询内容"],
  readableError: ["Error", "错误说明"],
  reason: ["Reason", "原因"],
  releaseCheckedAt: ["Release verified at", "释放验证时间"],
  remaining: ["Remaining items", "剩余项目"],
  requiresAdmin: ["Administrator required", "需要管理员权限"],
  requiresConfirmation: ["Confirmation required", "需要确认"],
  requiresConfirmationToken: ["Confirmation token required", "需要确认令牌"],
  requiresTerminalRestart: ["Terminal restart required", "需要重启终端"],
  returnCode: ["Return code", "返回码"],
  reversible: ["Reversible", "可回滚"],
  risk: ["Risk", "风险"],
  riskLevel: ["Risk level", "风险等级"],
  riskSummary: ["Risk summary", "风险摘要"],
  rollbackAvailable: ["Rollback available", "可以回滚"],
  rollbackId: ["Rollback ID", "回滚 ID"],
  runtimeSwitches: ["Runtime switches", "运行时切换"],
  source: ["Source", "来源"],
  sourceBackup: ["Source backup", "源目录备份"],
  snapshotCreatedAt: ["Snapshot created at", "快照创建时间"],
  snapshotReason: ["Snapshot reason", "快照原因"],
  startedAt: ["Started at", "开始时间"],
  status: ["Status", "状态"],
  step: ["Step", "步骤"],
  success: ["Success", "是否成功"],
  target: ["Target", "目标"],
  targetRoot: ["Target root", "目标根目录"],
  targetAppName: ["Target application", "目标应用"],
  targetExecutable: ["Target executable", "目标程序"],
  targetPath: ["Target path", "目标路径"],
  updatedAt: ["Updated at", "更新时间"],
  version: ["Version", "版本"],
  previousRoot: ["Previous root", "原根目录"],
  previousVersion: ["Previous version", "原版本"],
  pathDiff: ["PATH changes", "PATH 变更"],
  restoredHistoryId: ["Restored history ID", "已恢复历史 ID"],
  restoredProfileCount: ["Restored profile count", "已恢复配置档案数量"],
  warnings: ["Warnings", "警告"],
  willCleanupPath: ["Will clean PATH", "将清理 PATH"],
  willConfigureEnvironment: ["Will configure environment", "将配置环境"],
  willInstall: ["Will install", "将执行安装"],
  willWriteEnvironment: ["Will write environment", "将写入环境"],
};

export function escapeHtml(value: unknown): string {
  return localizeBackendText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export function valueOf(source: unknown, path: string, fallback: unknown = t("state.notAvailable")): string {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
  if (Array.isArray(value)) return String(value.length);
  if (value === null || value === undefined || value === "") return String(fallback);
  if (typeof value === "object") return Object.keys(value).length ? t("state.available") : String(fallback);
  if (typeof value === "boolean") return t(value ? "state.yes" : "state.no");
  return String(value);
}

export function renderMetric(label: string, value: unknown, detail = ""): string {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
}

export function renderBadge(label: string, tone: "neutral" | "success" | "warning" | "danger" = "neutral"): string {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
}

export function renderEmptyState(title: string, detail: string, action = ""): string {
  return `<div class="empty-state" role="status"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${action}</div>`;
}

export function renderLoadingState(label: string): string {
  return `<div class="loading-state" role="status" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><strong>${escapeHtml(label)}</strong></div>`;
}

export function renderErrorState(title: string, detail: string, retryAction: string): string {
  return `<section class="error-state" role="alert"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${renderActionButton(retryAction, t("state.retry"), "primary")}</section>`;
}

export function renderObjectTable(data: unknown, keys: string[]): string {
  return `<dl class="kv-list">${keys
    .map((key) => `<div><dt>${escapeHtml(objectFieldLabel(key))}</dt><dd>${escapeHtml(valueOf(data, key))}</dd></div>`)
    .join("")}</dl>`;
}

function objectFieldLabel(key: string): string {
  const label = objectFieldLabels[key];
  if (label) return localize(label[0], label[1]);
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

export function renderActionButton(id: string, label: string, tone = "secondary", disabled = false): string {
  return `<button class="button button--${tone} ${tone}" data-action="${id}" data-testid="${escapeHtml(actionTestId(id))}" type="button"${disabled ? " disabled aria-disabled=\"true\"" : ""}>${escapeHtml(label)}</button>`;
}

function actionTestId(id: string): string {
  const aliases: Record<string, string> = {
    "create-port-plan": "ports-create-plan",
    "execute-port-plan": "ports-execute-plan",
    "inspect-c-drive-rescue": "cleanup-disk-overview-action",
    "inspect-disk-overview": "cleanup-disk-overview-action",
    "create-expansion-plan": "cleanup-expansion-create-action",
    "execute-expansion-plan": "cleanup-expansion-execute-action",
    "scan-duplicate-large-files": "cleanup-duplicate-large-files-action",
    "create-desktop-archive-plan": "cleanup-desktop-archive-plan-action",
    "execute-desktop-archive-plan": "cleanup-desktop-archive-execute-action",
    "create-downloads-archive-plan": "cleanup-downloads-archive-plan-action",
    "execute-downloads-archive-plan": "cleanup-downloads-archive-execute-action",
    "create-association-plan": "file-associations-create-plan",
    "inspect-environment": "environment-inspect-action",
    "create-java-plan": "environment-java-stabilize-plan",
    "apply-java-plan": "environment-java-stabilize-result",
    "run-doctor-report": "reports-run-doctor-action",
    "export-doctor-markdown": "reports-export-markdown-action",
    "export-doctor-json": "reports-export-json-action",
    "open-latest-report-location": "reports-open-latest-export-action",
    "copy-report-summary": "reports-copy-summary-action",
    "create-doctor-repair-plan": "reports-repair-plan",
    "execute-doctor-repair-plan": "reports-repair-result",
    "export-debug-markdown": "settings-debug-export",
  };
  return aliases[id] ?? id;
}

export function pageItems<T>(items: T[], page: number, pageSize = 10): { items: T[]; page: number; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, totalPages, total };
}

export function renderPagination(scope: string, page: number, totalPages: number, total: number): string {
  if (total <= 10) return "";
  return `<div class="pagination" data-page-scope="${escapeHtml(scope)}">
    <button data-page-action="${escapeHtml(scope)}:prev" type="button" ${page <= 1 ? "disabled" : ""}>${t("pagination.previous")}</button>
    <span>${t("pagination.summary", { page, totalPages, total })}</span>
    <button data-page-action="${escapeHtml(scope)}:next" type="button" ${page >= totalPages ? "disabled" : ""}>${t("pagination.next")}</button>
  </div>`;
}

export function bindAction(root: ParentNode, id: string, handler: () => unknown | Promise<unknown>): void {
  root.querySelector<HTMLElement>(`[data-action="${id}"]`)?.addEventListener("click", () => {
    const actionLog = logDebug({ type: "click", name: id, status: "started" });
    Promise.resolve()
      .then(() => handler())
      .then(() => finishDebug(actionLog, "success"))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        finishDebug(actionLog, "failed", message, { action: id, error: message });
        window.dispatchEvent(new CustomEvent("devenv:action-error", { detail: message }));
      });
  });
}

export function revealResult(root: ParentNode, selector: string): void {
  window.requestAnimationFrame(() => {
    const target = root.querySelector<HTMLElement>(selector);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    target.focus({ preventScroll: true });
  });
}

export async function runLoad<T>(context: FeatureContext, label: string, loader: () => Promise<T>): Promise<T | null> {
  context.progress.start(label);
  try {
    const result = await loader();
    context.progress.done(t("state.operationComplete", { operation: label }));
    return result;
  } catch (error) {
    context.progress.fail(error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function loadSafe<T>(loader: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    return { ok: true, value: await loader() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
