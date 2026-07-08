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
  return `<section class="risk-section"><h3>${t("risk.whyGated")}</h3><p>${t("risk.boundOperation", { riskLevel: RiskBadge(operation.riskLevel), command: operation.title })}</p>${
    operation.warnings.length ? `<ul>${operation.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""
  }</section>`;
}

export function RiskBadge(riskLevel: string): string {
  const tone = riskLevel === "critical" ? "danger" : riskLevel === "high" ? "warning" : "neutral";
  return `<span class="status-badge status-badge--${tone}">${riskLevelLabel(riskLevel)}</span>`;
}

export function backupReceipt(operation: RiskOperationView): string {
  const required = operation.backupRequired ?? Boolean(operation.backupReceipt);
  const text = operation.backupReceipt
    ? t("risk.backupReceiptReady", { receipt: operation.backupReceipt })
    : required
      ? t("risk.backupReceiptRequiredMissing")
      : t("risk.backupReceiptNotRequired");
  return `<section class="risk-section"><h3>${t("risk.backupReceipt")}</h3><p>${text}</p></section>`;
}

export function confirmationDialog(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.recoveryExpectation")}</h3><p>${t("risk.recoveryDetail")}</p><p>${operation.title}</p></section>`;
}

export function tokenGate(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.tokenGate")}</h3><p>${t("risk.tokenGateDetail", { planId: `<code>${operation.planId}</code>` })}</p></section>`;
}

export function executionProgress(message: string): string {
  return `<section class="risk-section" data-risk-progress><h3>${t("risk.executionProgress")}</h3><p>${message}</p><small data-risk-elapsed></small></section>`;
}

export function resultReport(result: unknown, operation?: RiskOperationView): string {
  const value = operation?.command === "execute_profile_apply_plan"
    ? t("feature.profiles.applied")
    : result && typeof result === "object" && "message" in result
      ? String((result as { message: unknown }).message)
      : String(result);
  return `<section class="risk-section"><h3>${t("risk.result")}</h3><p>${value}</p></section>`;
}

export function errorReport(message: string): string {
  return `<section class="risk-section error-state"><h3>${t("risk.result")}</h3><p>${message}</p><button data-risk-copy-error type="button">${t("risk.copyError")}</button></section>`;
}

export function rollbackPanel(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>${t("risk.verificationRollback")}</h3><p>${t("risk.rollbackDetail")}</p><small>${operation.title}</small></section>`;
}

function riskLevelLabel(riskLevel: string): string {
  if (riskLevel === "critical") return t("risk.levelCritical");
  if (riskLevel === "high") return t("risk.levelHigh");
  if (riskLevel === "medium") return t("risk.levelMedium");
  if (riskLevel === "low") return t("risk.levelLow");
  return riskLevel;
}
