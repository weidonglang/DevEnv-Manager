import { readActiveView, normalizeWorkbenchView, type WorkbenchView } from "./state";

export function registerWorkbenchLifecycle(): void {
  window.addEventListener("DOMContentLoaded", () => {
    const activeView = readActiveView();
    window.dispatchEvent(new CustomEvent("devenv:navigate", { detail: activeView }));
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-view]") : null;
    const view = target?.dataset.view ? normalizeWorkbenchView(target.dataset.view) : undefined;
    if (view) {
      localStorage.setItem("devenv-manager.active-view", JSON.stringify(view));
    }
  });
}
