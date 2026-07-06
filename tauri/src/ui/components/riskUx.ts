import type { RiskOperationView } from "../../core/risk";

function rows(items: Array<{ label: string; value: string }> = []) {
  return items.length
    ? `<dl class="risk-rows">${items.map((item) => `<div><dt>${item.label}</dt><dd>${item.value}</dd></div>`).join("")}</dl>`
    : "";
}

export function planPreview(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>What will change</h3><p>${operation.summary}</p>${rows(operation.before)}${rows(operation.after)}</section>`;
}

export function riskExplanation(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Why this is gated</h3><p><strong>${operation.riskLevel}</strong> risk operation bound to <code>${operation.command}</code>.</p>${
    operation.warnings.length ? `<ul>${operation.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""
  }</section>`;
}

export function backupReceipt(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Backup or receipt</h3><p>${operation.backupReceipt || "No backup receipt supplied by this plan. Continue only if the plan explains why backup is not required."}</p></section>`;
}

export function confirmationDialog(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Recovery expectation</h3><p>Review the plan, backup, and command binding before execution. If the command fails, use the related backup or rollback panel for this feature.</p><p>${operation.title}</p></section>`;
}

export function tokenGate(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Token gate</h3><p>The confirmation token is single-use and bound to plan <code>${operation.planId}</code>.</p></section>`;
}

export function executionProgress(message: string): string {
  return `<section class="risk-section"><h3>Execution progress</h3><p>${message}</p></section>`;
}

export function resultReport(result: unknown): string {
  const value = result && typeof result === "object" && "message" in result ? String((result as { message: unknown }).message) : String(result);
  return `<section class="risk-section"><h3>Result</h3><p>${value}</p></section>`;
}

export function rollbackPanel(operation: RiskOperationView): string {
  return `<section class="risk-section"><h3>Verification and rollback</h3><p>Verify the affected environment, runtime, port, file association, or profile after execution. Use the related rollback or backup entry if the result is not correct.</p><small>${operation.command}</small></section>`;
}
