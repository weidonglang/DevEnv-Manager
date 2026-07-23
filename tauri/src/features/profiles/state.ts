import type { ConfigProfile, ConfigProfileHistoryEntry, ConfigProfileImportPreview, ProfileApplyPlan, ProfileHistoryRestorePlan, ProfileHistoryRestoreResult } from "../../types";

export type ProfilesState = {
  profiles: ConfigProfile[];
  selectedProfileId: string | null;
  plan: ProfileApplyPlan | null;
  importPreview: ConfigProfileImportPreview | null;
  importPath: string;
  importResult: string;
  operationResult: string;
  operationError: string;
  history: ConfigProfileHistoryEntry[];
  selectedHistoryId: string | null;
  historyPlan: ProfileHistoryRestorePlan | null;
  historyResult: ProfileHistoryRestoreResult | null;
  page: number;
};

export const profilesInitialState: ProfilesState = {
  profiles: [],
  selectedProfileId: null,
  plan: null,
  importPreview: null,
  importPath: "",
  importResult: "",
  operationResult: "",
  operationError: "",
  history: [],
  selectedHistoryId: null,
  historyPlan: null,
  historyResult: null,
  page: 1,
};
