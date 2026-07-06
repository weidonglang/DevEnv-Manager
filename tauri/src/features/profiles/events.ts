export function bindProfileEvents(root: ParentNode): void {
  root.querySelector("[data-profiles-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:profiles-refresh"));
  });
}
