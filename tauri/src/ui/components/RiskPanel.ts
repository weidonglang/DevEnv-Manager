import type { RiskLevel } from "../../core/risk";

export function riskPanel(level: RiskLevel, body: string): string {
  return `<section class="risk-panel risk-panel--${level}">${body}</section>`;
}
