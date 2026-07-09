import type { FeatureContext } from "../app/featureContext";
import { finishDebug, logDebug } from "../core/debugLog";
import { t } from "../core/i18n";

export type SafeResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export function valueOf(source: unknown, path: string, fallback: unknown = t("state.notAvailable")): string {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
  if (Array.isArray(value)) return String(value.length);
  if (value === null || value === undefined || value === "") return String(fallback);
  if (typeof value === "object") return Object.keys(value).length ? t("state.available") : String(fallback);
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
    .map((key) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(valueOf(data, key))}</dd></div>`)
    .join("")}</dl>`;
}

export function renderActionButton(id: string, label: string, tone = "secondary"): string {
  return `<button class="button button--${tone} ${tone}" data-action="${id}" data-testid="${escapeHtml(actionTestId(id))}" type="button">${escapeHtml(label)}</button>`;
}

function actionTestId(id: string): string {
  const aliases: Record<string, string> = {
    "create-port-plan": "ports-create-plan",
    "execute-port-plan": "ports-execute-plan",
    "inspect-c-drive-rescue": "cleanup-disk-overview-action",
    "inspect-disk-overview": "cleanup-disk-overview-action",
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
