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
  if (operation?.command === "execute_profile_apply_plan") {
    return `<section class="risk-section"><h3>${t("risk.result")}</h3><p>${t("feature.profiles.applied")}</p></section>`;
  }
  const resultRows = resultToRows(result);
  if (resultRows.length) {
    return `<section class="risk-section"><h3>${t("risk.result")}</h3>${rows(resultRows)}</section>`;
  }
  return `<section class="risk-section"><h3>${t("risk.result")}</h3><p>${escapeHtml(formatPrimitive(result))}</p></section>`;
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

function resultToRows(result: unknown): Array<{ label: string; value: string }> {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  return Object.entries(result as Record<string, unknown>)
    .filter(([key]) => key !== "reportMarkdown")
    .slice(0, 10)
    .map(([key, value]) => ({ label: escapeHtml(key), value: escapeHtml(formatValue(value)) }));
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (!value.length) return "0";
    const preview = value.slice(0, 3).map(formatValue).join("; ");
    return value.length > 3 ? `${value.length}: ${preview}` : preview;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
    if (!entries.length) return "{}";
    return entries.map(([key, child]) => `${key}: ${formatPrimitive(child)}`).join("; ");
  }
  return formatPrimitive(value);
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? t("state.yes") : t("state.no");
  return String(value);
}

function escapeHtml(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
