import type { JdkDistribution, RuntimeInfo, RuntimeStrongVerificationReport, RuntimeSwitchPlan, RuntimeSwitchResult, ValidationCheck } from "../../types";

export type RuntimeWorkbenchState = {
  runtimes: RuntimeInfo[];
  distributions: JdkDistribution[];
  strongVerification: RuntimeStrongVerificationReport | null;
  selectedRuntimeId: string | null;
  switchPlan: RuntimeSwitchPlan | null;
  switchResult: RuntimeSwitchResult | null;
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
  operationResult: "",
  operationError: "",
  externalJdkPath: "",
  externalJdkChecks: [],
  externalJdkResult: "",
  externalJdkError: "",
};
