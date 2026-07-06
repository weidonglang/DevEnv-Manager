import type { ToolchainWorkbenchReport } from "./types";

export function renderToolchainWorkbench(report: ToolchainWorkbenchReport): string {
  return `<section class="panel"><h2>Toolchains</h2><pre>${JSON.stringify(report, null, 2)}</pre></section>`;
}
