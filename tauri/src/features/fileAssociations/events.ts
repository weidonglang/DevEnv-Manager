export function bindFileAssociationEvents(root: ParentNode): void {
  root.querySelector("[data-file-associations-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:file-associations-refresh"));
  });
}
