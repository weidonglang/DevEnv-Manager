export function bindToolchainEvents(root: ParentNode): void {
  root.querySelector("[data-toolchains-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:toolchains-refresh"));
  });
}
