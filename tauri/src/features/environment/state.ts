import type { EnvBackupRecord, EnvHealthCheck, EnvReliabilitySnapshot, EnvRepairPlan, EnvironmentBackupInfo, EnvironmentConfigPreview } from "../../types";

export type EnvironmentPlanFailure = {
  step: string;
  command: string;
  exitCode: string;
  readableError: string;
  nextStep: string;
};

export type EnvironmentWorkbenchState = {
  reliability: EnvReliabilitySnapshot | null;
  health: EnvHealthCheck[];
  preview: EnvironmentConfigPreview | null;
  envBackups: EnvBackupRecord[];
  environmentBackups: EnvironmentBackupInfo[];
  plan: EnvRepairPlan | null;
  applyResult: string;
  selectedJdkRoot: string;
  createPlanFailure: EnvironmentPlanFailure | null;
  checking: boolean;
  errors: Partial<Record<"reliability" | "health" | "preview" | "envBackups" | "environmentBackups" | "createPlan" | "applyResult", string>>;
};

export const environmentWorkbenchInitialState: EnvironmentWorkbenchState = {
  reliability: null,
  health: [],
  preview: null,
  envBackups: [],
  environmentBackups: [],
  plan: null,
  applyResult: "",
  selectedJdkRoot: "",
  createPlanFailure: null,
  checking: false,
  errors: {},
};
