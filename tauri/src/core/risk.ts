import { invoke } from "./invoke";
import { t } from "./i18n";
import type { ConfirmationTokenView } from "../types";
import {
  backupReceipt,
  confirmationDialog,
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
  riskLevel: "medium" | "high" | "critical";
  backupReceipt?: string | null;
  title: string;
  summary: string;
  before?: Array<{ label: string; value: string }>;
  after?: Array<{ label: string; value: string }>;
  warnings: string[];
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
  const host = ensureRiskHost();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  host.innerHTML = `
    <div class="risk-ux" role="dialog" aria-modal="true" aria-label="${operation.title}">
      <div class="risk-ux__panel">
        <header><h2>${operation.title}</h2><button data-risk-close type="button">${t("risk.close")}</button></header>
        ${planPreview(operation)}
        ${riskExplanation(operation)}
        ${backupReceipt(operation)}
        ${confirmationDialog(operation)}
        ${tokenGate(operation)}
        <footer>
          <button data-risk-close type="button">${t("risk.cancel")}</button>
          <button data-risk-execute class="danger" type="button">${t("risk.createTokenAndExecute")}</button>
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
        try {
          executeButton.disabled = true;
          executeButton.textContent = t("risk.creatingToken");
          const token = await createRiskToken({
            command: operation.command,
            actionId: operation.actionId ?? operation.command,
            planId: operation.planId,
            riskLevel: operation.riskLevel,
            planFingerprint: await sha256Hex(`${operation.command}\0${operation.planId}\0${operation.riskLevel}`),
            tripleConfirmed: operation.riskLevel === "critical",
            backupReceipt: operation.backupReceipt,
          });
          const panel = host.querySelector<HTMLElement>(".risk-ux__panel");
          if (panel) panel.insertAdjacentHTML("beforeend", executionProgress(t("risk.executingThroughGate")));
          executeButton.textContent = t("risk.executing");
          const result = await operation.execute(token.token);
          if (panel) {
            panel.insertAdjacentHTML("beforeend", resultReport(result));
            panel.insertAdjacentHTML("beforeend", rollbackPanel(operation));
          }
          executeButton.textContent = t("risk.executed");
          resolve(result);
        } catch (error) {
          executeButton.disabled = false;
          executeButton.textContent = t("risk.createTokenAndExecute");
          reject(error);
        }
      })();
    });
  });
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
    document.body.appendChild(host);
  }
  return host;
}
