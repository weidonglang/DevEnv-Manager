export function updateEmptyState(updateError: string, escapeHtml: (value: string) => string) {
  return updateError
    ? `<div class="empty warning-text">最近检查失败：${escapeHtml(updateError)}</div>`
    : `<div class="empty">尚未检查新版本</div>`;
}
