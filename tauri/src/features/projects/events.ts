import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { finishDebug, logDebug } from "../../core/debugLog";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { analyzeProject, applyProjectConfiguration, inspectAgentTraces, inspectIdeaProject, inspectProjectPortConfigs, previewProjectConfiguration, updateProjectPort, verifyJavaConsumerEnvironment } from "./api";
import { renderProjectWorkbench } from "./render";
import type { ProjectWorkbenchState } from "./state";

export function bindProjectEvents(context: FeatureContext, state: ProjectWorkbenchState): void {
  bindAction(context.root, "choose-project-dir", async () => {
    const pickerLog = logDebug({ type: "click", name: "project-directory-picker", view: context.view, status: "started" });
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) {
        finishDebug(pickerLog, "cancelled", "Project directory selection cancelled.");
        context.toast(t("feature.projects.chooseCancelled"));
        return;
      }
      state.selectedPath = selected;
      rememberProjectPath(state.selectedPath);
      finishDebug(pickerLog, "success", "Project directory selected.", { selectedPath: state.selectedPath });
      renderAndBind(context, state);
    } catch (error) {
      const message = errorMessage(error);
      finishDebug(pickerLog, "failed", message);
      context.toast(message, true);
    }
  });
  bindAction(context.root, "analyze-project", () => refreshProject(context, state));
  bindAction(context.root, "preview-project-config", async () => {
    state.selectedPath = projectPath(context, state);
    try {
      state.preview = await previewProjectConfiguration(state.selectedPath);
      delete state.errors.preview;
    } catch (error) {
      state.errors.preview = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "apply-project-config", () => {
    if (!state.preview) {
      context.toast(t("toast.createProjectPreviewFirst"), true);
      return;
    }
    const preview = state.preview;
    const request = { ...preview, switches: preview.current };
    return context.risk.run({
      command: "apply_project_configuration",
      planId: projectConfigurationPlanId(request),
      riskLevel: "high",
      title: "Apply project configuration",
      summary: "Writes project configuration files after previewing append/create/replace semantics.",
      warnings: ["Review target files and backup metadata before applying."],
      execute: (confirmationToken) => applyProjectConfiguration(request, confirmationToken),
    });
  });
  bindAction(context.root, "inspect-project-ports", async () => {
    state.selectedPath = projectPath(context, state);
    try {
      state.ports = await inspectProjectPortConfigs(state.selectedPath);
      delete state.errors.ports;
    } catch (error) {
      state.errors.ports = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "update-project-port", () => {
    const port = state.ports[0];
    if (!port) {
      context.toast(t("toast.inspectProjectPortsFirst"), true);
      return;
    }
    return context.risk.run({
      command: "update_project_port",
      planId: `${projectPath(context, state)}:${port.id}:${port.currentPort}`,
      riskLevel: "high",
      title: "Update project port",
      summary: "Updates a selected project port file through a token-gated backend command.",
      warnings: ["Confirm the target file and new port before execution."],
      execute: (confirmationToken) => updateProjectPort(projectPath(context, state), port.id, port.currentPort, confirmationToken),
    });
  });
  bindAction(context.root, "inspect-idea-project", async () => {
    state.selectedPath = projectPath(context, state);
    try {
      state.idea = await inspectIdeaProject(state.selectedPath);
      delete state.errors.idea;
    } catch (error) {
      state.errors.idea = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "verify-java-consumer", async () => {
    state.selectedPath = projectPath(context, state);
    try {
      state.javaConsumer = await verifyJavaConsumerEnvironment("Nacos", state.selectedPath);
      delete state.errors.javaConsumer;
    } catch (error) {
      state.errors.javaConsumer = errorMessage(error);
    }
    renderAndBind(context, state);
  });
}

export async function refreshProject(context: FeatureContext, state: ProjectWorkbenchState): Promise<void> {
  state.selectedPath = projectPath(context, state);
  const [analysis, ports, traces] = await Promise.allSettled([
    analyzeProject(state.selectedPath),
    inspectProjectPortConfigs(state.selectedPath),
    inspectAgentTraces(state.selectedPath),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  if (analysis.status === "fulfilled") state.analysis = analysis.value;
  else state.errors.analysis = errorMessage(analysis.reason);
  if (ports.status === "fulfilled") state.ports = ports.value;
  else state.errors.ports = errorMessage(ports.reason);
  if (traces.status === "fulfilled") state.traces = traces.value;
  else state.errors.traces = errorMessage(traces.reason);
  renderAndBind(context, state);
}

function projectPath(context: FeatureContext, state: ProjectWorkbenchState): string {
  const path = context.root.querySelector<HTMLInputElement>("#project-path")?.value.trim() || state.selectedPath;
  if (path) rememberProjectPath(path);
  return path;
}

function rememberProjectPath(path: string): void {
  if (path) localStorage.setItem("devenv.projects.selectedPath", path);
}

function renderAndBind(context: FeatureContext, state: ProjectWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderProjectWorkbench(state);
  bindProjectEvents(context, state);
}

function projectConfigurationPlanId(request: { projectPath: string; files: Array<{ enabled: boolean }>; switches: Record<string, string | undefined> }): string {
  const enabled = request.files.filter((file) => file.enabled).length;
  const switchCount = ["jdk", "python", "node", "maven", "gradle", "go"].filter((key) => Boolean(request.switches[key])).length;
  return `${request.projectPath.trim().replace(/\//g, "\\").toLowerCase()}:${enabled}:${switchCount}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
