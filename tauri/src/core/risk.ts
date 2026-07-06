import { invoke } from "./invoke";
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
  host.innerHTML = `
    <div class="risk-ux" role="dialog" aria-modal="true" aria-label="${operation.title}">
      <div class="risk-ux__panel">
        <header><h2>${operation.title}</h2><button data-risk-close type="button">Close</button></header>
        ${planPreview(operation)}
        ${riskExplanation(operation)}
        ${backupReceipt(operation)}
        ${confirmationDialog(operation)}
        ${tokenGate(operation)}
        <footer>
          <button data-risk-close type="button">Cancel</button>
          <button data-risk-execute class="danger" type="button">Create token and execute</button>
        </footer>
      </div>
    </div>
  `;
  const close = () => {
    host.innerHTML = "";
  };
  host.querySelectorAll("[data-risk-close]").forEach((button) => button.addEventListener("click", close));
  return new Promise((resolve, reject) => {
    host.querySelector("[data-risk-execute]")?.addEventListener("click", () => {
      void (async () => {
        try {
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
          if (panel) panel.insertAdjacentHTML("beforeend", executionProgress("Executing through backend token gate."));
          const result = await operation.execute(token.token);
          if (panel) {
            panel.insertAdjacentHTML("beforeend", resultReport(result));
            panel.insertAdjacentHTML("beforeend", rollbackPanel(operation));
          }
          resolve(result);
        } catch (error) {
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
