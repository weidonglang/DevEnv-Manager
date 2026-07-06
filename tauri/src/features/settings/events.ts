export function bindSettingsEvents(root: ParentNode): void {
  root.querySelector("[data-settings-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:settings-refresh"));
  });
}
