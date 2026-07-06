export function bindDashboardEvents(root: ParentNode): void {
  root.querySelector("[data-dashboard-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:dashboard-refresh"));
  });
}
