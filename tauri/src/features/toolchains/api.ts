import type { ToolchainWorkbenchReport } from "./types";

export function loadToolchainReport(): Promise<ToolchainWorkbenchReport> {
  return Promise.reject(new Error("Toolchain API is provided by the legacy bootstrap during this refactor."));
}
