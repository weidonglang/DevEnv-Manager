import { invoke } from "./invoke";
import type { ConfirmationTokenView } from "../types";

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
