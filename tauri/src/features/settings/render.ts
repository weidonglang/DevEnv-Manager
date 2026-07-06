import type { SettingsWorkbenchSnapshot } from "./types";

export function renderSettingsWorkbench(snapshot: SettingsWorkbenchSnapshot): string {
  return `<section class="panel"><h2>Settings</h2><pre>${JSON.stringify(snapshot, null, 2)}</pre></section>`;
}
