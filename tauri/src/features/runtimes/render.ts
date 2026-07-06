import { escapeHtml, renderActionButton, renderMetric, valueOf } from "../sharedView";
import { t } from "../../core/i18n";
import { renderFeatureGuide } from "../../components/featureGuide";
import type { RuntimeWorkbenchState } from "./state";

export function renderRuntimeWorkbench(state: RuntimeWorkbenchState): string {
  return `
    <div class="feature-layout">
      <section class="panel">
        <div class="panel-head"><div><h2>${t("route.runtimes.label")}</h2><p>${t("feature.runtimes.description")}</p></div></div>
        ${renderFeatureGuide("runtimes")}
        <div class="metrics">
          ${renderMetric(t("feature.runtimes.installed"), state.runtimes.length)}
          ${renderMetric(t("feature.runtimes.distributions"), state.distributions.length)}
          ${renderMetric(t("feature.runtimes.verification"), valueOf(state.strongVerification, "status"))}
        </div>
        <div class="toolbar">
          ${renderActionButton("refresh-runtimes", t("feature.runtimes.discover"), "primary")}
          ${renderActionButton("install-jdk", t("feature.runtimes.installJdk"))}
          ${renderActionButton("install-node", t("feature.runtimes.installNode"))}
          ${renderActionButton("install-python", t("feature.runtimes.installPython"))}
          ${renderActionButton("install-go", t("feature.runtimes.installGo"))}
        </div>
      </section>
      <section class="panel">
        <h2>${t("feature.runtimes.installedVersions")}</h2>
        <div class="runtime-list">
          ${state.runtimes.map(renderRuntimeRow).join("") || `<div class="empty">${t("feature.runtimes.empty")}</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderRuntimeRow(runtime: unknown): string {
  return `<article class="runtime">
    <div><strong>${escapeHtml(valueOf(runtime, "kind"))} ${escapeHtml(valueOf(runtime, "version"))}</strong><span>${escapeHtml(valueOf(runtime, "path"))}</span></div>
    <small>Executable: ${escapeHtml(valueOf(runtime, "executable"))} · Current: ${escapeHtml(valueOf(runtime, "current"))} · Status: ${escapeHtml(valueOf(runtime, "validationStatus"))}</small>
    <div class="row-actions">${renderActionButton("switch-runtime", t("feature.runtimes.switch"))}${renderActionButton("uninstall-runtime", t("feature.runtimes.uninstall"), "danger")}</div>
  </article>`;
}
