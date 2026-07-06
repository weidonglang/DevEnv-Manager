export function bindRuntimeEvents(root: ParentNode): void {
  root.querySelector("[data-runtimes-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:runtimes-refresh"));
  });
}
