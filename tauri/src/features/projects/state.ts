import type { AgentTraceReport, IdeaProjectReport, JavaConsumerReport, ProjectAnalysis, ProjectConfigPreview, ProjectPortConfig } from "../../types";

export type ProjectWorkbenchState = {
  analysis: ProjectAnalysis | null;
  preview: ProjectConfigPreview | null;
  ports: ProjectPortConfig[];
  idea: IdeaProjectReport | null;
  javaConsumer: JavaConsumerReport | null;
  traces: AgentTraceReport | null;
  selectedPath: string;
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
  errors: {},
};
