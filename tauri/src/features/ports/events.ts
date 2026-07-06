export function bindPortEvents(root: ParentNode): void {
  root.querySelector("[data-ports-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:ports-refresh"));
  });
}
