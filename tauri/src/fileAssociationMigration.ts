import type { FileAssociationUiState } from "./features/fileAssociations";
import type { FileAssociationAppSearchResult } from "./types";

export type MigratedFileAssociationUiState = FileAssociationUiState & {
  appQuery: string;
  appSearchResult: FileAssociationAppSearchResult | null;
  targetAppName: string;
  targetExecutable: string;
  extensionInput: string;
  advancedHighRisk: boolean;
};

export function enhanceFileAssociationPanel(
  root: HTMLElement,
  state: MigratedFileAssociationUiState,
) {
  const panel = root.querySelector<HTMLElement>(".file-assoc-panel");
  if (!panel) return;

  panel.querySelectorAll(":scope > .operation-result").forEach((element) => element.remove());
  const result = document.createElement("div");
  result.id = "file-assoc-operation-result";
  result.className = `operation-result${state.applyResultMessage ? "" : " hidden"}`;
  result.dataset.testid = "file-association-operation-result";
  appendLines(result, state.applyResultMessage);
  panel.querySelector(".advanced-warning")?.insertAdjacentElement("afterend", result);

  panel.querySelectorAll<HTMLButtonElement>("button[data-file-assoc-plan-one]").forEach((button) => {
    button.textContent = "更改打开方式";
  });
  panel.querySelectorAll<HTMLButtonElement>("button[data-file-assoc-rollback]").forEach((button) => {
    button.textContent = "确认并回滚";
  });

  const targetName = panel.querySelector<HTMLInputElement>("#file-assoc-target-name");
  const targetExecutable = panel.querySelector<HTMLInputElement>("#file-assoc-target-exe");
  const extensionInput = panel.querySelector<HTMLInputElement>("#file-assoc-extension-input");
  const advancedRisk = panel.querySelector<HTMLInputElement>("#file-assoc-advanced-risk");
  if (targetName) targetName.value = state.targetAppName;
  if (targetExecutable) targetExecutable.value = state.targetExecutable;
  if (extensionInput && state.extensionInput) extensionInput.value = state.extensionInput;
  if (advancedRisk) advancedRisk.checked = state.advancedHighRisk;

  const appSection = panel.querySelector<HTMLElement>(".file-assoc-app-grid > section:first-child");
  const firstForm = appSection?.querySelector<HTMLElement>(".form-row");
  if (appSection && firstForm) {
    const searchRow = document.createElement("div");
    searchRow.className = "form-row";
    const searchInput = document.createElement("input");
    searchInput.id = "file-assoc-app-search";
    searchInput.value = state.appQuery;
    searchInput.placeholder = "搜索 VS Code、IDEA、记事本等已安装应用";
    const searchButton = document.createElement("button");
    searchButton.id = "search-file-assoc-app";
    searchButton.textContent = "查找已安装应用";
    searchRow.append(searchInput, searchButton);
    appSection.insertBefore(searchRow, firstForm);

    if (state.appSearchResult) {
      appSection.insertBefore(renderAppSearchResult(state.appSearchResult), firstForm);
    }
  }

  const planToolbar = panel.querySelector<HTMLElement>(".file-assoc-plan .toolbar.compact");
  if (planToolbar) planToolbar.id = "file-assoc-plan-preview";
}

function renderAppSearchResult(search: FileAssociationAppSearchResult) {
  const container = document.createElement("div");
  container.className = "file-assoc-app-results";
  container.dataset.testid = "file-association-app-search-result";

  const message = document.createElement("div");
  message.className = "small-note";
  message.textContent = search.message;
  container.append(message);

  if (!search.candidates.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "未自动找到应用，请使用“选择 exe”。";
    container.append(empty);
    return container;
  }

  search.candidates.forEach((candidate, index) => {
    const article = document.createElement("article");
    article.className = "runtime";
    const heading = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = candidate.displayName;
    const source = document.createElement("span");
    source.textContent = `${candidate.confidence}% · ${candidate.source}`;
    heading.append(name, source);
    const path = document.createElement("small");
    path.textContent = candidate.executablePath;
    const button = document.createElement("button");
    button.dataset.fileAssocUseApp = String(index);
    button.disabled = !candidate.exists;
    button.textContent = candidate.exists ? "使用此应用" : "未安装";
    article.append(heading, path, button);
    container.append(article);
  });
  return container;
}

function appendLines(element: HTMLElement, value: string) {
  value.split("\n").forEach((line, index) => {
    if (index) element.append(document.createElement("br"));
    element.append(document.createTextNode(line));
  });
}
