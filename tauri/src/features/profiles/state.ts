import type { ConfigProfile } from "../../types";

export type ProfilesState = {
  profiles: ConfigProfile[];
  selectedProfileId: string | null;
};

export const profilesInitialState: ProfilesState = {
  profiles: [],
  selectedProfileId: null,
};
