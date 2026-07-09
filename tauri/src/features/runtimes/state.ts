import type { JdkDistribution, RuntimeInfo, RuntimeStrongVerificationReport } from "../../types";

export type RuntimeWorkbenchState = {
  runtimes: RuntimeInfo[];
  distributions: JdkDistribution[];
  strongVerification: RuntimeStrongVerificationReport | null;
  selectedRuntimeId: string | null;
  operationResult: string;
  operationError: string;
  page: number;
};

export const runtimeWorkbenchInitialState: RuntimeWorkbenchState = {
  runtimes: [],
  distributions: [],
  strongVerification: null,
  selectedRuntimeId: null,
  operationResult: "",
  operationError: "",
  page: 1,
};
