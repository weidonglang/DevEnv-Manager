export function enhanceProjectReportPanel(root: Document, iconMarkup: string) {
  const actions = root.querySelector<HTMLElement>("#view-project .project-actions");
  if (!actions || root.querySelector("#export-project-report-markdown")) return;

  actions.append(
    reportButton("export-project-report-markdown", "导出项目报告", iconMarkup),
    reportButton("export-project-report-json", "导出项目 JSON", iconMarkup),
  );
  const output = root.querySelector<HTMLElement>("#project-output");
  if (output) {
    output.dataset.testid = "project-report-result";
    output.setAttribute("aria-live", "polite");
  }
}

function reportButton(id: string, label: string, iconMarkup: string) {
  const button = document.createElement("button");
  button.id = id;
  const icon = document.createElement("template");
  icon.innerHTML = iconMarkup;
  const text = document.createElement("span");
  text.textContent = label;
  button.append(icon.content, text);
  return button;
}
