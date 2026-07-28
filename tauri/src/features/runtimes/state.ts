import type { JdkDistribution, RuntimeInfo, RuntimeStrongVerificationReport, RuntimeSwitchPlan, RuntimeSwitchResult, ValidationCheck } from "../../types";

export type RuntimeSwitchPhase =
  | "idle"
  | "planning"
  | "planReady"
  | "executing"
  | "succeeded"
  | "failed";

export type RuntimeWorkbenchState = {
  runtimes: RuntimeInfo[];
  distributions: JdkDistribution[];
  strongVerification: RuntimeStrongVerificationReport | null;
  selectedRuntimeId: string | null;
  switchPlan: RuntimeSwitchPlan | null;
  switchResult: RuntimeSwitchResult | null;
  switchPhase: RuntimeSwitchPhase;
  switchTargetRuntimeId: string | null;
  switchTargetMode: "managed" | "external-user" | "provider" | "project" | null;
  switchTargetLabel: string;
  runtimeProjectRoot: string;
  switchInlineMessage: string;
  switchInlineError: string;
  switchRequestId: number;
  operationResult: string;
  operationError: string;
  externalJdkPath: string;
  externalJdkChecks: ValidationCheck[];
  externalJdkResult: string;
  externalJdkError: string;
};

export const runtimeWorkbenchInitialState: RuntimeWorkbenchState = {
  runtimes: [],
  distributions: [],
  strongVerification: null,
  selectedRuntimeId: null,
  switchPlan: null,
  switchResult: null,
  switchPhase: "idle",
  switchTargetRuntimeId: null,
  switchTargetMode: null,
  switchTargetLabel: "",
  runtimeProjectRoot: "",
  switchInlineMessage: "",
  switchInlineError: "",
  switchRequestId: 0,
  operationResult: "",
  operationError: "",
  externalJdkPath: "",
  externalJdkChecks: [],
  externalJdkResult: "",
  externalJdkError: "",
};
