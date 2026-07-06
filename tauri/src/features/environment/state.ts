import type { EnvBackupRecord, EnvHealthCheck, EnvReliabilitySnapshot, EnvRepairPlan, EnvironmentBackupInfo, EnvironmentConfigPreview } from "../../types";

export type EnvironmentWorkbenchState = {
  reliability: EnvReliabilitySnapshot | null;
  health: EnvHealthCheck[];
  preview: EnvironmentConfigPreview | null;
  envBackups: EnvBackupRecord[];
  environmentBackups: EnvironmentBackupInfo[];
  plan: EnvRepairPlan | null;
};

export const environmentWorkbenchInitialState: EnvironmentWorkbenchState = {
  reliability: null,
  health: [],
  preview: null,
  envBackups: [],
  environmentBackups: [],
  plan: null,
};
