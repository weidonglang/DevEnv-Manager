import { readActiveView, type WorkbenchView } from "./state";

export function registerWorkbenchLifecycle(): void {
  window.addEventListener("DOMContentLoaded", () => {
    const activeView = readActiveView();
    const button = document.querySelector<HTMLButtonElement>(`[data-view="${activeView}"]`);
    if (button) {
      button.click();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-view]") : null;
    const view = target?.dataset.view as WorkbenchView | undefined;
    if (view) {
      localStorage.setItem("devenv-manager.active-view", JSON.stringify(view));
    }
  });
}
