import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type CommandArgs = Record<string, unknown>;

export function invoke<T = unknown>(command: string, args?: CommandArgs): Promise<T> {
  return tauriInvoke<T>(command, args);
}
