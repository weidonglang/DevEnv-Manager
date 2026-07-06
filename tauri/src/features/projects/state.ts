import type { ProjectWorkbenchSnapshot } from "./types";

export type ProjectWorkbenchState = {
  snapshot: ProjectWorkbenchSnapshot | null;
  selectedPath: string;
};

export const projectWorkbenchInitialState: ProjectWorkbenchState = {
  snapshot: null,
  selectedPath: "",
};
