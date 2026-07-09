import type { AgentTraceReport, IdeaProjectReport, JavaConsumerReport, OperationResult, ProjectAnalysis, ProjectConfigPreview, ProjectPortConfig } from "../../types";

export type ProjectWorkbenchState = {
  analysis: ProjectAnalysis | null;
  preview: ProjectConfigPreview | null;
  ports: ProjectPortConfig[];
  idea: IdeaProjectReport | null;
  javaConsumer: JavaConsumerReport | null;
  traces: AgentTraceReport | null;
  selectedPath: string;
  recentPaths: string[];
  applyResult: OperationResult | null;
  errors: Partial<Record<"analysis" | "preview" | "ports" | "idea" | "javaConsumer" | "traces", string>>;
};

export const projectWorkbenchInitialState: ProjectWorkbenchState = {
  analysis: null,
  preview: null,
  ports: [],
  idea: null,
  javaConsumer: null,
  traces: null,
  selectedPath: "",
  recentPaths: [],
  applyResult: null,
  errors: {},
};
