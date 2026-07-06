export function bindEnvironmentEvents(root: ParentNode): void {
  root.querySelector("[data-environment-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:environment-refresh"));
  });
}
