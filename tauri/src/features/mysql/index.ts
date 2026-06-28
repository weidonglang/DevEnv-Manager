export const MYSQL_PERMISSION_UNKNOWN_HELP =
  "当前权限不足以读取 Data 目录，因此无法判断系统库是否完整；这不等于 MySQL 已损坏。";

export function mysqlPathValue(label: string, value: string, clipboardIcon: string, escapeHtml: (value: string) => string) {
  return `<div class="copyable-kv"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value || "未识别")}">${escapeHtml(value || "未识别")}</strong>${value ? `<button data-action="copy-text" data-copy="${escapeHtml(value)}">${clipboardIcon}<span>复制</span></button>` : ""}</div>`;
}
