export function bindReportEvents(root: ParentNode): void {
  root.querySelector("[data-reports-refresh]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("devenv:reports-refresh"));
  });
}
