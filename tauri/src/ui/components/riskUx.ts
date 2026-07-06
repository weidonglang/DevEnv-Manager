import type { RiskOperationView } from "../../core/risk";
import { t } from "../../core/i18n";

function rows(items: Array<{ label: string; value: string }> = []) {
  return items.length
    ? `<dl class="risk-rows">${items.map((item) => `<div><dt>${item.label}</dt><dd>${item.value}</dd></div>`).join("")}</dl>`
    : "";
}

export function planPreview(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.whatWillChange")}</h3><p>${operation.summary}</p>${rows(operation.before)}${rows(operation.after)}</section>`;
}

export function riskExplanation(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.whyGated")}</h3><p>${t("risk.boundOperation", { riskLevel: RiskBadge(operation.riskLevel), command: `<code>${operation.command}</code>` })}</p>${
    operation.warnings.length ? `<ul>${operation.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""
  }</section>`;
}

export function RiskBadge(riskLevel: string): string {
  const tone = riskLevel === "critical" ? "danger" : riskLevel === "high" ? "warning" : "neutral";
  return `<span class="status-badge status-badge--${tone}">${riskLevel}</span>`;
}

export function backupReceipt(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.backupReceipt")}</h3><p>${operation.backupReceipt || t("risk.noBackupReceipt")}</p></section>`;
}

export function confirmationDialog(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.recoveryExpectation")}</h3><p>${t("risk.recoveryDetail")}</p><p>${operation.title}</p></section>`;
}

export function tokenGate(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.tokenGate")}</h3><p>${t("risk.tokenGateDetail", { planId: `<code>${operation.planId}</code>` })}</p></section>`;
}

export function executionProgress(message: string): string {
  return `<section class="risk-section"><h3>${t("risk.executionProgress")}</h3><p>${message}</p></section>`;
}

export function resultReport(result: unknown): string {
  const value = result && typeof result === "object" && "message" in result ? String((result as { message: unknown }).message) : String(result);
  return `<section class="risk-section"><h3>${t("risk.result")}</h3><p>${value}</p></section>`;
}

export function rollbackPanel(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.verificationRollback")}</h3><p>${t("risk.rollbackDetail")}</p><small>${operation.command}</small></section>`;
}
