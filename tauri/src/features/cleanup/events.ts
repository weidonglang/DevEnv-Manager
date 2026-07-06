export function bindCleanupEvents(root: ParentNode): void {
  root.querySelector("[data-cleanup-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:cleanup-refresh"));
  });
}
