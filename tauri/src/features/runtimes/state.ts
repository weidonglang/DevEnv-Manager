import type { JdkDistribution, RuntimeInfo, RuntimeStrongVerificationReport } from "../../types";

export type RuntimeWorkbenchState = {
  runtimes: RuntimeInfo[];
  distributions: JdkDistribution[];
  strongVerification: RuntimeStrongVerificationReport | null;
  selectedRuntimeId: string | null;
};

export const runtimeWorkbenchInitialState: RuntimeWorkbenchState = {
  runtimes: [],
  distributions: [],
  strongVerification: null,
  selectedRuntimeId: null,
};
