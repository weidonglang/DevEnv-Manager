import type { ToolchainWorkbenchReport } from "./types";

export type ToolchainWorkbenchState = {
  report: ToolchainWorkbenchReport | null;
};

export const toolchainWorkbenchInitialState: ToolchainWorkbenchState = {
  report: null,
};
