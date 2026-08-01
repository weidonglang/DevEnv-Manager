import { invoke } from "./invoke";
import { localize, t } from "./i18n";
import { finishDebug, logDebug } from "./debugLog";
import type { ConfirmationTokenView } from "../types";
import {
  backupReceipt,
  confirmationDialog,
  errorReport,
  executionProgress,
  planPreview,
  resultReport,
  riskExplanation,
  rollbackPanel,
  tokenGate,
} from "../ui/components/riskUx";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskTokenRequest = {
  command: string;
  actionId: string;
  planId: string;
  riskLevel: RiskLevel | string;
  planFingerprint: string;
  tripleConfirmed: boolean;
  backupReceipt?: string | null;
};

export type RiskOperationView = {
  command: string;
  actionId?: string;
  planId: string;
  riskLevel: RiskLevel | string;
  planFingerprint?: string;
  planCreatedAt?: string;
  planExpiresAt?: string;
  backupReceipt?: string | null;
  backupRequired?: boolean;
  title: string;
  summary: string;
  before?: Array<{ label: string; value: string }>;
  after?: Array<{ label: string; value: string }>;
  warnings: string[];
  presentation?: "standard" | "compact";
  confirmLabel?: string;
  execute: (token: string) => Promise<unknown>;
};

export type RunRiskOperation = (operation: RiskOperationView) => Promise<unknown>;

export function riskFingerprint(parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
    .join("|");
}

export function createRiskToken(request: RiskTokenRequest): Promise<ConfirmationTokenView> {
  return invoke<ConfirmationTokenView>("create_confirmation_token", {
    command: request.command,
    actionId: request.actionId,
    planId: request.planId,
    riskLevel: request.riskLevel,
    planFingerprint: request.planFingerprint,
    tripleConfirmed: request.tripleConfirmed,
    backupReceipt: request.backupReceipt || null,
  });
}

export async function runRiskOperation(operation: RiskOperationView): Promise<unknown> {
  const operationId = `${operation.command}:${operation.planId}:${Date.now()}`;
  const riskLog = logDebug({
    type: "risk",
    name: operation.title,
    status: "started",
    operationId,
    relatedCommand: operation.command,
    command: operation.command,
    planId: operation.planId,
    riskLevel: operation.riskLevel,
    data: {
      command: operation.command,
      actionId: operation.actionId ?? operation.command,
      planId: operation.planId,
      riskLevel: operation.riskLevel,
      planCreatedAt: operation.planCreatedAt,
      planExpiresAt: operation.planExpiresAt,
      backupReceiptRequired: operation.backupRequired ?? Boolean(operation.backupReceipt),
      backupReceiptCreated: Boolean(operation.backupReceipt),
      backupReceiptId: operation.backupReceipt || "",
    },
  });
  const host = ensureRiskHost();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  host.innerHTML = `
    <div class="risk-ux" role="dialog" aria-modal="true" aria-label="${operation.title}" data-testid="global-risk-dialog">
      <div class="risk-ux__panel">
        <header><h2>${operation.title}</h2><button data-risk-close type="button">${t("risk.close")}</button></header>
        ${operation.presentation === "compact" ? compactConfirmation(operation) : `${planPreview(operation)}${riskExplanation(operation)}${backupReceipt(operation)}${confirmationDialog(operation)}${tokenGate(operation)}`}
        <footer>
          <button data-risk-close type="button">${t("risk.cancel")}</button>
          <button data-risk-execute class="danger" type="button" data-testid="global-risk-result">${operation.confirmLabel ?? t("risk.createTokenAndExecute")}</button>
        </footer>
      </div>
    </div>
  `;
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;
  const close = () => {
    host.innerHTML = "";
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    previousFocus?.focus();
  };
  host.querySelectorAll("[data-risk-close]").forEach((button) => button.addEventListener("click", close));
  const executeButton = host.querySelector<HTMLButtonElement>("[data-risk-execute]");
  const closeButton = host.querySelector<HTMLButtonElement>("[data-risk-close]");
  keyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      close();
    }
  };
  window.addEventListener("keydown", keyHandler);
  closeButton?.focus();
  return new Promise((resolve, reject) => {
    executeButton?.addEventListener("click", () => {
      void (async () => {
        let heartbeat: number | undefined;
        const started = Date.now();
        try {
          executeButton.disabled = true;
          const authorizingMessage = operation.presentation === "compact" ? localize("Verifying operation...", "正在验证操作...") : t("risk.creatingToken");
          executeButton.textContent = authorizingMessage;
          updateRiskProgress(host, authorizingMessage, started);
          const planFingerprint = operation.planFingerprint ?? await sha256Hex(`${operation.command}\0${operation.planId}\0${operation.riskLevel}`);
          const tokenLog = logDebug({
            type: "token",
            name: "create_confirmation_token",
            status: "started",
            operationId: `${operationId}:token`,
            parentOperationId: operationId,
            relatedCommand: operation.command,
            command: operation.command,
            planId: operation.planId,
            riskLevel: operation.riskLevel,
            data: {
              command: operation.command,
              actionId: operation.actionId ?? operation.command,
              planId: operation.planId,
              riskLevel: operation.riskLevel,
              planFingerprint,
              backupReceiptRequired: operation.backupRequired ?? Boolean(operation.backupReceipt),
              backupReceiptCreated: Boolean(operation.backupReceipt),
              backupReceiptId: operation.backupReceipt || "",
            },
          });
          const token = await createRiskToken({
            command: operation.command,
            actionId: operation.actionId ?? operation.command,
            planId: operation.planId,
            riskLevel: operation.riskLevel,
            planFingerprint,
            tripleConfirmed: operation.riskLevel === "critical",
            backupReceipt: operation.backupReceipt,
          });
          finishDebug(tokenLog, "success", t("risk.tokenCreated"), {
            tokenCreated: true,
            command: token.command,
            actionId: token.actionId,
            planId: token.planId,
            riskLevel: token.riskLevel,
            backupReceiptRequired: operation.backupRequired ?? Boolean(operation.backupReceipt),
            backupReceiptCreated: Boolean(operation.backupReceipt),
            backupReceiptId: operation.backupReceipt || "",
          });
          const panel = host.querySelector<HTMLElement>(".risk-ux__panel");
          if (panel) panel.insertAdjacentHTML("beforeend", executionProgress(t("risk.executingThroughGate")));
          updateRiskProgress(host, t("risk.executingThroughGate"), started);
          heartbeat = window.setInterval(() => {
            const elapsed = Date.now() - started;
            const message = elapsed > 60_000 ? t("risk.stillRunning60") : elapsed > 30_000 ? t("risk.stillRunning30") : elapsed > 10_000 ? t("risk.stillRunning10") : t("risk.executingThroughGate");
            updateRiskProgress(host, message, started);
          }, 1000);
          executeButton.textContent = t("risk.executing");
          const executeLog = logDebug({
            type: "risk",
            name: `${operation.title}:execute`,
            status: "started",
            operationId: `${operationId}:execute`,
            parentOperationId: operationId,
            relatedCommand: operation.command,
            command: operation.command,
            planId: operation.planId,
            riskLevel: operation.riskLevel,
            data: { command: operation.command, planId: operation.planId, planFingerprint },
          });
          const result = await operation.execute(token.token);
          finishDebug(executeLog, "success", result && typeof result === "object" && "message" in result ? String((result as { message: unknown }).message) : undefined, result);
          window.clearInterval(heartbeat);
          if (panel) {
            panel.insertAdjacentHTML("beforeend", resultReport(result, operation));
            panel.insertAdjacentHTML("beforeend", rollbackPanel(operation));
            panel.querySelector<HTMLElement>("[data-risk-result-report]")?.scrollIntoView({ block: "start", behavior: "smooth" });
          }
          executeButton.textContent = t("risk.executed");
          host.querySelectorAll<HTMLButtonElement>("[data-risk-close]").forEach((button) => {
            button.textContent = t("risk.close");
          });
          finishDebug(riskLog, "success", result && typeof result === "object" && "message" in result ? String((result as { message: unknown }).message) : undefined, result);
          resolve(result);
        } catch (error) {
          window.clearInterval(heartbeat);
          executeButton.disabled = false;
          executeButton.textContent = operation.confirmLabel ?? t("risk.createTokenAndExecute");
          const rawMessage = error instanceof Error ? error.message : String(error);
          const message = normalizeRiskError(rawMessage, operation);
          const panel = host.querySelector<HTMLElement>(".risk-ux__panel");
          if (panel) {
            panel.insertAdjacentHTML("beforeend", errorReport(message));
            panel.querySelector<HTMLButtonElement>("[data-risk-copy-error]")?.addEventListener("click", () => {
              void navigator.clipboard.writeText(message);
            });
          }
          finishDebug(riskLog, "failed", message, { rawMessage, command: operation.command, actionId: operation.actionId ?? operation.command, planId: operation.planId, riskLevel: operation.riskLevel, planFingerprint: operation.planFingerprint });
          reject(error);
        }
      })();
    });
  });
}

function compactConfirmation(operation: RiskOperationView): string {
  const before = operation.before?.map((item) => `<div><dt>${escapeRiskText(item.label)}</dt><dd>${escapeRiskText(item.value)}</dd></div>`).join("") ?? "";
  const warnings = operation.warnings.filter(Boolean).map((warning) => `<li>${escapeRiskText(warning)}</li>`).join("");
  return `<section class="risk-section risk-section--compact" data-testid="compact-risk-confirmation">
    <p>${escapeRiskText(operation.summary)}</p>
    ${before ? `<dl class="kv-list">${before}</dl>` : ""}
    ${warnings ? `<div class="small-note"><strong>${localize("Warnings", "警告")}</strong><ul>${warnings}</ul></div>` : ""}
  </section>`;
}

function escapeRiskText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function normalizeRiskError(message: string, operation: RiskOperationView): string {
  if (message.includes("confirmation token") && (message.includes("不匹配") || message.includes("鍖归厤") || message.includes("mismatch"))) {
    return t("risk.tokenPlanMismatch", { operation: operation.title, planId: operation.planId });
  }
  if (message.includes("confirmation token") && (message.includes("过期") || message.includes("expired") || message.includes("繃鏈"))) {
    return t("risk.tokenExpired", { operation: operation.title, planId: operation.planId });
  }
  return message;
}

function updateRiskProgress(host: HTMLElement, message: string, started: number): void {
  const progress = host.querySelector<HTMLElement>("[data-risk-progress] p");
  const elapsed = host.querySelector<HTMLElement>("[data-risk-elapsed]");
  if (progress) progress.textContent = message;
  if (elapsed) elapsed.textContent = t("risk.elapsed", { seconds: Math.max(0, Math.round((Date.now() - started) / 1000)) });
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ensureRiskHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>("#risk-ux-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "risk-ux-host";
    host.dataset.testid = "global-debug-status";
    document.body.appendChild(host);
  }
  return host;
}
