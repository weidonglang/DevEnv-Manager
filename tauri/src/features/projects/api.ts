import { invoke } from "../../core/invoke";
import type { AgentTraceReport, CommandRunResult, IdeaProjectReport, JavaConsumerReport, OperationResult, ProjectAnalysis, ProjectConfigPreview, ProjectPortConfig } from "../../types";

export function analyzeProject(path: string): Promise<ProjectAnalysis> {
  return invoke<ProjectAnalysis>("analyze_project", { path });
}

export function previewProjectConfiguration(projectPath: string): Promise<ProjectConfigPreview> {
  return invoke<ProjectConfigPreview>("preview_project_configuration", { projectPath });
}

export function inspectProjectPortConfigs(path: string): Promise<ProjectPortConfig[]> {
  return invoke<ProjectPortConfig[]>("inspect_project_port_configs", { path });
}

export function inspectIdeaProject(path: string): Promise<IdeaProjectReport> {
  return invoke<IdeaProjectReport>("inspect_idea_project", { path });
}

export function verifyJavaConsumerEnvironment(consumer: "Nacos" | "Nexus", root: string): Promise<JavaConsumerReport> {
  const command = consumer === "Nexus" ? "verify_nexus_java_environment" : "verify_java_consumer_environment";
  return invoke<JavaConsumerReport>(command, consumer === "Nexus" ? { root } : { consumer, root });
}

export function inspectAgentTraces(projectPath: string): Promise<AgentTraceReport> {
  return invoke<AgentTraceReport>("inspect_agent_traces", { projectPath });
}

export function runProjectAction(path: string, action: string): Promise<CommandRunResult> {
  return invoke<CommandRunResult>("run_project_action", { path, action });
}

export function applyProjectConfiguration(request: unknown, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("apply_project_configuration", { request, confirmationToken });
}

export function updateProjectPort(path: string, configId: string, newPort: number, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("update_project_port", { path, configId, newPort, confirmationToken });
}
