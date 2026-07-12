import type { EnvBackupDiff, EnvBackupRecord, EnvHealthCheck, EnvReliabilitySnapshot, EnvRepairPlan, EnvironmentBackupInfo, EnvironmentConfigPreview, PythonAnalysis, PythonRepairPlan } from "../../types";

export type EnvironmentPlanFailure = {
  step: string;
  command: string;
  exitCode: string;
  readableError: string;
  nextStep: string;
};

export type EnvironmentRestorePlan = {
  kind: "envCore" | "legacy";
  backupName: string;
  createdAt: string;
  reason: string;
  changedVariables: string[];
  currentJavaHome: string;
  backupJavaHome: string;
  currentPathEntries: number;
  backupPathEntries: number;
};

export type EnvironmentWorkbenchState = {
  reliability: EnvReliabilitySnapshot | null;
  health: EnvHealthCheck[];
  preview: EnvironmentConfigPreview | null;
  envBackups: EnvBackupRecord[];
  environmentBackups: EnvironmentBackupInfo[];
  plan: EnvRepairPlan | null;
  pythonAnalysis: PythonAnalysis | null;
  pythonPlan: PythonRepairPlan | null;
  pythonResult: string;
  pythonError: string;
  aliasResult: string;
  aliasError: string;
  selectedBackupId: string;
  backupDiff: EnvBackupDiff | null;
  restorePlan: EnvironmentRestorePlan | null;
  restoreResult: string;
  restoreError: string;
  restoreVerification: string;
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
  pythonAnalysis: null,
  pythonPlan: null,
  pythonResult: "",
  pythonError: "",
  aliasResult: "",
  aliasError: "",
  selectedBackupId: "",
  backupDiff: null,
  restorePlan: null,
  restoreResult: "",
  restoreError: "",
  restoreVerification: "",
  applyResult: "",
  selectedJdkRoot: "",
  createPlanFailure: null,
  checking: false,
  errors: {},
};
