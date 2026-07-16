import type { JdkDistribution, RuntimeInfo, RuntimeStrongVerificationReport, ValidationCheck } from "../../types";

export type RuntimeWorkbenchState = {
  runtimes: RuntimeInfo[];
  distributions: JdkDistribution[];
  strongVerification: RuntimeStrongVerificationReport | null;
  selectedRuntimeId: string | null;
  operationResult: string;
  operationError: string;
  externalJdkPath: string;
  externalJdkChecks: ValidationCheck[];
  externalJdkResult: string;
  externalJdkError: string;
  page: number;
};

export const runtimeWorkbenchInitialState: RuntimeWorkbenchState = {
  runtimes: [],
  distributions: [],
  strongVerification: null,
  selectedRuntimeId: null,
  operationResult: "",
  operationError: "",
  externalJdkPath: "",
  externalJdkChecks: [],
  externalJdkResult: "",
  externalJdkError: "",
  page: 1,
};
