import type { ConfigProfile, ConfigProfileImportPreview, ProfileApplyPlan } from "../../types";

export type ProfilesState = {
  profiles: ConfigProfile[];
  selectedProfileId: string | null;
  plan: ProfileApplyPlan | null;
  importPreview: ConfigProfileImportPreview | null;
};

export const profilesInitialState: ProfilesState = {
  profiles: [],
  selectedProfileId: null,
  plan: null,
  importPreview: null,
};
