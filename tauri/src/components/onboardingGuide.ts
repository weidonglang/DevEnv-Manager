import { t } from "../core/i18n";

type OnboardingGuideOptions = {
  onDismiss?: () => Promise<void> | void;
};

type GuideStep = {
  title: string;
  description: string;
  items: string[];
};

export function showOnboardingGuide(options: OnboardingGuideOptions = {}): void {
  document.querySelector("[data-testid='onboarding-dialog']")?.remove();
  const host = document.createElement("div");
  host.className = "onboarding-overlay";
  host.dataset.testid = "onboarding-dialog";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", t("onboarding.dialogLabel"));
  document.body.appendChild(host);
  document.body.classList.add("modal-locked");

  let stepIndex = 0;
  let closing = false;

  const close = async () => {
    if (closing) return;
    closing = true;
    host.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = true;
    });
    try {
      await options.onDismiss?.();
      host.remove();
      if (!document.querySelector(".risk-ux, .onboarding-overlay")) {
        document.body.classList.remove("modal-locked");
      }
    } catch (error) {
      closing = false;
      render(error instanceof Error ? error.message : String(error));
    }
  };

  const render = (error = "") => {
    const steps = onboardingSteps();
    const step = steps[stepIndex];
    const stepTestId = ["onboarding-step-1", "onboarding-step-2", "onboarding-step-3", "onboarding-step-4"][stepIndex];
    const isLast = stepIndex === steps.length - 1;
    host.innerHTML = `
      <section class="onboarding-dialog" data-testid="${stepTestId}">
        <header class="onboarding-header">
          <div>
            <p class="eyebrow">${escapeHtml(t("onboarding.step", { current: stepIndex + 1, total: steps.length }))}</p>
            <h2>${escapeHtml(step.title)}</h2>
            <p>${escapeHtml(step.description)}</p>
          </div>
          <div class="onboarding-progress" aria-hidden="true">
            ${steps.map((_, index) => `<span class="${index <= stepIndex ? "is-active" : ""}"></span>`).join("")}
          </div>
        </header>
        <div class="onboarding-content">
          ${step.items.map((item) => `<article><span aria-hidden="true">${stepIndex + 1}</span><p>${escapeHtml(item)}</p></article>`).join("")}
        </div>
        ${error ? `<div class="error-state" data-testid="onboarding-error">${escapeHtml(error)}</div>` : ""}
        <footer class="onboarding-actions">
          <button type="button" class="button button--secondary" data-onboarding-action="skip" data-testid="onboarding-skip">${t("onboarding.skip")}</button>
          <div>
            <button type="button" class="button button--secondary" data-onboarding-action="back" data-testid="onboarding-back" ${stepIndex === 0 ? "disabled" : ""}>${t("onboarding.back")}</button>
            <button type="button" class="button button--primary primary" data-onboarding-action="next" data-testid="onboarding-next">${isLast ? t("onboarding.finish") : t("onboarding.next")}</button>
          </div>
        </footer>
      </section>
    `;
    host.querySelector<HTMLButtonElement>("[data-onboarding-action='next']")?.focus();
    host.querySelector("[data-onboarding-action='back']")?.addEventListener("click", () => {
      stepIndex = Math.max(0, stepIndex - 1);
      render();
    });
    host.querySelector("[data-onboarding-action='next']")?.addEventListener("click", () => {
      if (isLast) {
        void close();
        return;
      }
      stepIndex += 1;
      render();
    });
    host.querySelector("[data-onboarding-action='skip']")?.addEventListener("click", () => void close());
  };

  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      void close();
    }
  });
  render();
}

function onboardingSteps(): GuideStep[] {
  return [
    {
      title: t("onboarding.welcome.title"),
      description: t("onboarding.welcome.description"),
      items: [t("onboarding.welcome.point1"), t("onboarding.welcome.point2"), t("onboarding.welcome.point3")],
    },
    {
      title: t("onboarding.navigate.title"),
      description: t("onboarding.navigate.description"),
      items: [t("onboarding.navigate.runtime"), t("onboarding.navigate.environment"), t("onboarding.navigate.ports"), t("onboarding.navigate.cleanup")],
    },
    {
      title: t("onboarding.workflow.title"),
      description: t("onboarding.workflow.description"),
      items: [t("onboarding.workflow.scan"), t("onboarding.workflow.choose"), t("onboarding.workflow.preview"), t("onboarding.workflow.verify")],
    },
    {
      title: t("onboarding.start.title"),
      description: t("onboarding.start.description"),
      items: [t("onboarding.start.dashboard"), t("onboarding.start.runtimes"), t("onboarding.start.environment"), t("onboarding.start.settings")],
    },
  ];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
