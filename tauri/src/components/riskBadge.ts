import { riskTextMap } from "../safetyText";

export function riskBadge(risk: string) {
  const safeRisk = risk || "info";
  return `<span class="risk-chip risk-${safeRisk}">${riskTextMap[safeRisk] || safeRisk}</span>`;
}
