import type { FileAssociationAppSearchResult, FileAssociationBackupSummary, FileAssociationPlan, FileAssociationReport } from "../../types";

export type FileAssociationUiState = {
  report: FileAssociationReport | null;
  backups: FileAssociationBackupSummary[];
  plan: FileAssociationPlan | null;
  activeTab: "overview" | "types" | "apps" | "backups" | "safety";
  filter: {
    keyword: string;
    risk: string;
    category: string;
    onlyMissingApp: boolean;
  };
  selectedExtensions: Set<string>;
  targetAppName: string;
  targetExecutable: string;
  appSearch: FileAssociationAppSearchResult | null;
  applyResultMessage: string;
};

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
