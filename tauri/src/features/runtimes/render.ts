import { escapeHtml, renderActionButton, renderMetric, valueOf } from "../sharedView";
import type { RuntimeWorkbenchState } from "./state";

export function renderRuntimeWorkbench(state: RuntimeWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>Runtimes</h2><p>Manage JDK, Node, Python, Go, Maven, and Gradle through plan-first actions.</p></div></div>
        <div class="metrics">
          ${renderMetric("Installed runtimes", state.runtimes.length)}
          ${renderMetric("JDK distributions", state.distributions.length)}
          ${renderMetric("Strong verification", valueOf(state.strongVerification, "status"))}
        </div>
        <div class="toolbar">
          ${renderActionButton("refresh-runtimes", "Discover Runtimes", "primary")}
          ${renderActionButton("install-jdk", "Install JDK")}
          ${renderActionButton("install-node", "Install Node.js")}
          ${renderActionButton("install-python", "Install Python")}
          ${renderActionButton("install-go", "Install Go")}
        </div>
      </section>
      <section class="panel">
        <h2>Installed versions</h2>
        <div class="runtime-list">
          ${state.runtimes.map(renderRuntimeRow).join("") || `<div class="empty">No runtimes discovered yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderRuntimeRow(runtime: unknown): string {
  return `<article class="runtime">
    <div><strong>${escapeHtml(valueOf(runtime, "kind"))} ${escapeHtml(valueOf(runtime, "version"))}</strong><span>${escapeHtml(valueOf(runtime, "path"))}</span></div>
    <small>Executable: ${escapeHtml(valueOf(runtime, "executable"))} · Current: ${escapeHtml(valueOf(runtime, "current"))} · Status: ${escapeHtml(valueOf(runtime, "validationStatus"))}</small>
    <div class="row-actions">${renderActionButton("switch-runtime", "Switch")}${renderActionButton("uninstall-runtime", "Uninstall", "danger")}</div>
  </article>`;
}
