import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { finishDebug, logDebug } from "./debugLog";

export type CommandArgs = Record<string, unknown>;

export function invoke<T = unknown>(command: string, args?: CommandArgs): Promise<T> {
  const log = logDebug({ type: "invoke", name: command, status: "started", data: args });
  try {
    return tauriInvoke<T>(command, args)
      .then((result) => {
        finishDebug(log, "success", summarize(result), result);
        return result;
      })
      .catch((error) => {
        const normalized = normalizeInvokeError(command, error);
        finishDebug(log, "failed", normalized instanceof Error ? normalized.message : String(normalized), { command, error: normalized instanceof Error ? normalized.message : String(normalized) });
        return Promise.reject(normalized);
      });
  } catch (error) {
    const normalized = normalizeInvokeError(command, error);
    finishDebug(log, "failed", normalized instanceof Error ? normalized.message : String(normalized), { command, error: normalized instanceof Error ? normalized.message : String(normalized) });
    return Promise.reject(normalized);
  }
}

function normalizeInvokeError(command: string, error: unknown): unknown {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("invoke") || message.includes("__TAURI")) {
    return new Error(`Tauri backend is not available for "${command}" in this preview environment.`);
  }
  return error;
}

function summarize(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.message) return String(record.message);
    const parts = [
      field(record, "planId") || field(record, "plan_id"),
      field(record, "riskLevel") || field(record, "risk_level"),
      field(record, "status"),
      field(record, "success"),
      field(record, "totalExtensions"),
      field(record, "totalItems"),
      field(record, "estimatedBytes"),
      field(record, "generatedAt"),
      field(record, "currentVersion"),
      field(record, "latestVersion"),
      countField(record, "items"),
      countField(record, "records"),
      countField(record, "categories"),
      countField(record, "checks"),
      countField(record, "warnings"),
      countField(record, "suggestions"),
    ].filter(Boolean);
    if (parts.length) return parts.join(" / ");
    const keys = Object.keys(record).slice(0, 5);
    return keys.length ? `fields: ${keys.join(", ")}` : "";
  }
  return String(value ?? "");
}

function field(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (value === null || value === undefined || value === "") return "";
  return `${key}: ${String(value)}`;
}

function countField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (!Array.isArray(value)) return "";
  return `${key}: ${value.length}`;
}
