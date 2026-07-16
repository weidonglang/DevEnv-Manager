import { localize } from "../../core/i18n";

export function updateEmptyState(updateError: string, escapeHtml: (value: string) => string) {
  return updateError
    ? `<div class="empty warning-text">${localize("The latest update check failed", "最近检查失败")}：${escapeHtml(updateError)}</div>`
    : `<div class="empty">${localize("Updates have not been checked", "尚未检查新版本")}</div>`;
}
