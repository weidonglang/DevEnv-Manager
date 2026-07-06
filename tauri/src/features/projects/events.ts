export function bindProjectEvents(root: ParentNode): void {
  root.querySelector("[data-project-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:project-refresh"));
  });
}
