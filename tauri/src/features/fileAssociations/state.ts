import type { FileAssociationUiState } from ".";

export const fileAssociationInitialState: FileAssociationUiState = {
  report: null,
  backups: [],
  plan: null,
  activeTab: "overview",
  filter: {
    keyword: "",
    risk: "",
    category: "",
    onlyMissingApp: false,
  },
  selectedExtensions: new Set<string>(),
  targetAppName: "",
  targetExecutable: "",
  appSearch: null,
  applyResultMessage: "",
};
