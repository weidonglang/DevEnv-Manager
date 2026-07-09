import type { ConfigProfile, ConfigProfileImportPreview, ProfileApplyPlan } from "../../types";

export type ProfilesState = {
  profiles: ConfigProfile[];
  selectedProfileId: string | null;
  plan: ProfileApplyPlan | null;
  importPreview: ConfigProfileImportPreview | null;
  importPath: string;
  importResult: string;
  operationResult: string;
  operationError: string;
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
  page: 1,
};
