import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type CommandArgs = Record<string, unknown>;

export function invoke<T = unknown>(command: string, args?: CommandArgs): Promise<T> {
  try {
    return tauriInvoke<T>(command, args).catch((error) => Promise.reject(normalizeInvokeError(command, error)));
  } catch (error) {
    return Promise.reject(normalizeInvokeError(command, error));
  }
}

function normalizeInvokeError(command: string, error: unknown): unknown {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("invoke") || message.includes("__TAURI")) {
    return new Error(`Tauri backend is not available for "${command}" in this preview environment.`);
  }
  return error;
}
