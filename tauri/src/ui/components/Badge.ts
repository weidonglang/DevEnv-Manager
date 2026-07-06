export function badge(label: string, tone = "neutral"): string {
  return `<span class="badge badge--${tone}">${label}</span>`;
}
