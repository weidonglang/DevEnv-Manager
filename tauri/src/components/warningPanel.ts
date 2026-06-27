export function warningPanel(items: string[]) {
  if (!items.length) return "";
  return `<ul class="scan-warnings">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}
