import type { AgentTraceReport, IdeaProjectReport, JavaConsumerReport, OperationResult, ProjectAnalysis, ProjectConfigPreview, ProjectPortConfig } from "../../types";

export type ProjectOperation = "analysis" | "preview" | "applyResult" | "ports" | "idea" | "javaConsumer" | "traces";
export type ProjectOperationStatus = "idle" | "loading" | "success" | "empty" | "failed";

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
  status: Record<ProjectOperation, ProjectOperationStatus>;
  errors: Partial<Record<ProjectOperation, string>>;
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
  status: {
    analysis: "idle",
    preview: "idle",
    applyResult: "idle",
    ports: "idle",
    idea: "idle",
    javaConsumer: "idle",
    traces: "idle",
  },
  errors: {},
};
