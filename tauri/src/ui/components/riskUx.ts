import type { RiskOperationView } from "../../core/risk";

function rows(items: Array<{ label: string; value: string }> = []) {
  return items.length
    ? `<dl class="risk-rows">${items.map((item) => `<div><dt>${item.label}</dt><dd>${item.value}</dd></div>`).join("")}</dl>`
    : "";
}

export function planPreview(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Plan preview</h3><p>${operation.summary}</p>${rows(operation.before)}${rows(operation.after)}</section>`;
}

export function riskExplanation(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Risk</h3><p><strong>${operation.riskLevel}</strong> operation: ${operation.command}</p>${
    operation.warnings.length ? `<ul>${operation.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""
  }</section>`;
}

export function backupReceipt(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Backup</h3><p>${operation.backupReceipt || "No backup receipt supplied by this plan."}</p></section>`;
}

export function confirmationDialog(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Confirmation</h3><p>Review the plan, backup, and command binding before executing.</p><p>${operation.title}</p></section>`;
}

export function tokenGate(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Token gate</h3><p>Token is bound to <code>${operation.planId}</code>.</p></section>`;
}

export function executionProgress(message: string): string {
  return `<section class="risk-section"><h3>Execution progress</h3><p>${message}</p></section>`;
}

export function resultReport(result: unknown): string {
  const value = result && typeof result === "object" && "message" in result ? String((result as { message: unknown }).message) : String(result);
  return `<section class="risk-section"><h3>Result</h3><p>${value}</p></section>`;
}

export function rollbackPanel(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Rollback</h3><p>Use the related backup or rollback feature after reviewing the result.</p><small>${operation.command}</small></section>`;
}
