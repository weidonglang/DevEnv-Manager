import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { analyzeProject, applyProjectConfiguration, inspectIdeaProject, inspectProjectPortConfigs, previewProjectConfiguration, updateProjectPort, verifyJavaConsumerEnvironment } from "./api";
import { renderProjectWorkbench } from "./render";
import type { ProjectWorkbenchState } from "./state";

export function bindProjectEvents(context: FeatureContext, state: ProjectWorkbenchState): void {
  bindAction(context.root, "analyze-project", () => refreshProject(context, state));
  bindAction(context.root, "preview-project-config", async () => {
    state.selectedPath = projectPath(context, state);
    state.preview = await previewProjectConfiguration(state.selectedPath);
    context.root.innerHTML = renderProjectWorkbench(state);
    bindProjectEvents(context, state);
  });
  bindAction(context.root, "apply-project-config", () =>
    context.risk.run({
      command: "apply_project_configuration",
      planId: valueOf(state.preview, "previewId", "project-config-preview"),
      riskLevel: "high",
      title: "Apply project configuration",
      summary: "Writes project configuration files after previewing append/create/replace semantics.",
      warnings: ["Review target files and backup metadata before applying."],
      execute: (confirmationToken) => applyProjectConfiguration(state.preview, confirmationToken),
    }),
  );
  bindAction(context.root, "inspect-project-ports", async () => {
    state.selectedPath = projectPath(context, state);
    state.ports = await inspectProjectPortConfigs(state.selectedPath);
    context.root.innerHTML = renderProjectWorkbench(state);
    bindProjectEvents(context, state);
  });
  bindAction(context.root, "update-project-port", () =>
    context.risk.run({
      command: "update_project_port",
      planId: `${projectPath(context, state)}:project-port`,
      riskLevel: "high",
      title: "Update project port",
      summary: "Updates a selected project port file through a token-gated backend command.",
      warnings: ["Confirm the target file and new port before execution."],
      execute: (confirmationToken) => updateProjectPort(projectPath(context, state), valueOf(state.ports[0], "id", ""), Number(valueOf(state.ports[0], "port", "0")), confirmationToken),
    }),
  );
  bindAction(context.root, "inspect-idea-project", async () => {
    state.idea = await inspectIdeaProject(projectPath(context, state));
    context.toast("IDEA project inspection finished.");
  });
  bindAction(context.root, "verify-java-consumer", async () => {
    state.javaConsumer = await verifyJavaConsumerEnvironment("Nacos", projectPath(context, state));
    context.toast("Java consumer verification finished.");
  });
}

export async function refreshProject(context: FeatureContext, state: ProjectWorkbenchState): Promise<void> {
  state.selectedPath = projectPath(context, state);
  state.analysis = await analyzeProject(state.selectedPath);
  context.root.innerHTML = renderProjectWorkbench(state);
  bindProjectEvents(context, state);
}

function projectPath(context: FeatureContext, state: ProjectWorkbenchState): string {
  return context.root.querySelector<HTMLInputElement>("#project-path")?.value.trim() || state.selectedPath;
}
