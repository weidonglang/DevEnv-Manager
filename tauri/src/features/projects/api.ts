import type { ProjectWorkbenchSnapshot } from "./types";

export function analyzeProject(path: string): Promise<ProjectWorkbenchSnapshot> {
  void path;
  return Promise.reject(new Error("Project API is provided by the legacy bootstrap during this refactor."));
}
