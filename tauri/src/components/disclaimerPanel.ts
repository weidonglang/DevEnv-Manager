import { t } from "../core/i18n";

export function disclaimerPanel(requireAccept = true): string {
  const action = requireAccept
    ? `<button id="accept-safety-disclaimer" class="button button--primary primary" type="button">${t("safety.accept")}</button>`
    : `<button data-safety-close class="button button--secondary" type="button">${t("safety.close")}</button>`;
  return `<section class="disclaimer-panel">
    <h2>${t("safety.title")}</h2>
    ${safetyNoticeParagraphs().map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    <p><strong>${t("safety.localOnly")}</strong></p>
    ${action}
  </section>`;
}

export function showSafetyNoticeDialog(): void {
  const host = document.createElement("div");
  host.className = "risk-ux";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", t("safety.title"));
  host.innerHTML = `<div class="risk-ux__panel">${disclaimerPanel(false)}</div>`;
  document.body.appendChild(host);
  const close = () => host.remove();
  host.querySelector("[data-safety-close]")?.addEventListener("click", close);
  host.addEventListener("click", (event) => {
    if (event.target === host) close();
  });
}

function safetyNoticeParagraphs(): string[] {
  return ["safety.p1", "safety.p2", "safety.p3", "safety.p4", "safety.p5"].map((key) => t(key as Parameters<typeof t>[0]));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
