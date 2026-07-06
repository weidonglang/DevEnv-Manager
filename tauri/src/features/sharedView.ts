import type { FeatureContext } from "../app/featureContext";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export function valueOf(source: unknown, path: string, fallback: unknown = "Not available"): string {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
  if (Array.isArray(value)) return String(value.length);
  if (value === null || value === undefined || value === "") return String(fallback);
  if (typeof value === "object") return Object.keys(value).length ? "Available" : String(fallback);
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
  return `<section class="error-state" role="alert"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${renderActionButton(retryAction, "Retry", "primary")}</section>`;
}

export function renderObjectTable(data: unknown, keys: string[]): string {
  return `<dl class="kv-list">${keys
    .map((key) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(valueOf(data, key))}</dd></div>`)
    .join("")}</dl>`;
}

export function renderActionButton(id: string, label: string, tone = "secondary"): string {
  return `<button class="button button--${tone} ${tone}" data-action="${id}" type="button">${escapeHtml(label)}</button>`;
}

export function bindAction(root: ParentNode, id: string, handler: () => unknown | Promise<unknown>): void {
  root.querySelector<HTMLElement>(`[data-action="${id}"]`)?.addEventListener("click", () => {
    void handler();
  });
}

export async function runLoad<T>(context: FeatureContext, label: string, loader: () => Promise<T>): Promise<T | null> {
  context.progress.start(label);
  try {
    const result = await loader();
    context.progress.done(`${label} complete`);
    return result;
  } catch (error) {
    context.progress.fail(error instanceof Error ? error.message : String(error));
    return null;
  }
}
