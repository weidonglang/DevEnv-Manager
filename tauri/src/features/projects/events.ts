import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { finishDebug, logDebug } from "../../core/debugLog";
import { localize, t } from "../../core/i18n";
import { bindAction, revealResult } from "../sharedView";
import { analyzeProject, applyProjectConfiguration, inspectAgentTraces, inspectIdeaProject, inspectProjectPortConfigs, previewProjectConfiguration, updateProjectPort, verifyJavaConsumerEnvironment } from "./api";
import { renderProjectWorkbench } from "./render";
import type { ProjectWorkbenchState } from "./state";

export function bindProjectEvents(context: FeatureContext, state: ProjectWorkbenchState): void {
  context.root.querySelectorAll<HTMLButtonElement>("[data-recent-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextPath = button.dataset.recentProject || state.selectedPath;
      if (!sameProjectPath(nextPath, state.selectedPath)) resetProjectResults(state);
      state.selectedPath = nextPath;
      renderAndBind(context, state);
    });
  });
  bindAction(context.root, "choose-project-dir", async () => {
    const pickerLog = logDebug({ type: "click", name: "project-directory-picker", view: context.view, status: "started" });
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) {
        finishDebug(pickerLog, "cancelled", "Project directory selection cancelled.");
        context.toast(t("feature.projects.chooseCancelled"));
        return;
      }
      if (!sameProjectPath(selected, state.selectedPath)) resetProjectResults(state);
      state.selectedPath = selected;
      rememberProjectPath(state.selectedPath);
      state.recentPaths = readRecentProjectPaths();
      finishDebug(pickerLog, "success", "Project directory selected.", { selectedPath: state.selectedPath });
      renderAndBind(context, state);
    } catch (error) {
      const message = errorMessage(error);
      finishDebug(pickerLog, "failed", message);
      state.errors.analysis = message;
      renderAndBind(context, state);
    }
  });
  bindAction(context.root, "analyze-project", () => refreshProject(context, state));
  bindAction(context.root, "preview-project-config", async () => {
    state.selectedPath = projectPath(context, state);
    state.status.preview = "loading";
    state.preview = null;
    delete state.errors.preview;
    renderAndBind(context, state);
    try {
      state.preview = await previewProjectConfiguration(state.selectedPath);
      state.status.preview = state.preview.files.length ? "success" : "empty";
      delete state.errors.preview;
      delete state.errors.applyResult;
      state.status.applyResult = "idle";
    } catch (error) {
      state.status.preview = "failed";
      state.errors.preview = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-config-plan']");
  });
  bindAction(context.root, "apply-project-config", async () => {
    if (!state.preview || !sameProjectPath(state.preview.projectPath, state.selectedPath)) {
      state.applyResult = null;
      state.status.applyResult = "failed";
      state.errors.applyResult = state.preview
        ? localize("The preview belongs to another project. Create a new preview for the selected directory.", "当前预览属于另一个项目，请为所选目录重新创建预览。")
        : t("toast.createProjectPreviewFirst");
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='projects-config-plan']");
      return;
    }
    const preview = state.preview;
    const request = { ...preview, switches: preview.current };
    state.applyResult = null;
    state.status.applyResult = "loading";
    delete state.errors.applyResult;
    renderAndBind(context, state);
    try {
      const result = await context.risk.run({
        command: "apply_project_configuration",
        planId: projectConfigurationPlanId(request),
        riskLevel: "high",
        backupReceipt: `${preview.projectPath}\\.devenv-manager\\backups\\<execution-time>`,
        title: localize("Apply project configuration", "应用项目配置"),
        summary: localize("Writes project configuration files after previewing append/create/replace semantics.", "预览追加、创建或替换语义后写入项目配置文件。"),
        warnings: [localize("Review target files and backup metadata before applying.", "应用前请检查目标文件和备份元数据。")],
        execute: (confirmationToken) => applyProjectConfiguration(request, confirmationToken),
      });
      state.applyResult = result as ProjectWorkbenchState["applyResult"];
      state.status.applyResult = state.applyResult?.success ? "success" : "failed";
      delete state.errors.applyResult;
    } catch (error) {
      state.status.applyResult = "failed";
      state.errors.applyResult = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-apply-result']");
  });
  bindAction(context.root, "inspect-project-ports", async () => {
    state.selectedPath = projectPath(context, state);
    state.status.ports = "loading";
    delete state.errors.ports;
    renderAndBind(context, state);
    try {
      state.ports = await inspectProjectPortConfigs(state.selectedPath);
      state.status.ports = state.ports.length ? "success" : "empty";
      delete state.errors.ports;
    } catch (error) {
      state.status.ports = "failed";
      state.errors.ports = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-port-result']");
  });
  bindAction(context.root, "update-project-port", async () => {
    const port = state.ports[0];
    if (!port) {
      state.applyResult = null;
      state.status.applyResult = "failed";
      state.errors.applyResult = t("toast.inspectProjectPortsFirst");
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='projects-port-result']");
      return;
    }
    state.applyResult = null;
    state.status.applyResult = "loading";
    delete state.errors.applyResult;
    renderAndBind(context, state);
    try {
      const result = await context.risk.run({
        command: "update_project_port",
        planId: `${projectPath(context, state)}:${port.id}:${port.currentPort}`,
        riskLevel: "medium",
        backupReceipt: port.backupPath || `${port.file}.devenv-backup-<execution-time>`,
        title: localize("Update project port", "更新项目端口"),
        summary: localize("Updates a selected project port file through a token-gated backend command.", "通过确认令牌保护的后端命令更新所选项目端口文件。"),
        warnings: [localize("Confirm the target file and new port before execution.", "执行前请确认目标文件和新端口。")],
        execute: (confirmationToken) => updateProjectPort(projectPath(context, state), port.id, port.currentPort, confirmationToken),
      });
      state.applyResult = result as ProjectWorkbenchState["applyResult"];
      state.ports = await inspectProjectPortConfigs(projectPath(context, state));
      state.status.applyResult = state.applyResult?.success ? "success" : "failed";
      state.status.ports = state.ports.length ? "success" : "empty";
      delete state.errors.applyResult;
      delete state.errors.ports;
    } catch (error) {
      state.status.applyResult = "failed";
      state.errors.applyResult = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-apply-result']");
  });
  bindAction(context.root, "inspect-idea-project", async () => {
    state.selectedPath = projectPath(context, state);
    state.status.idea = "loading";
    delete state.errors.idea;
    renderAndBind(context, state);
    try {
      state.idea = await inspectIdeaProject(state.selectedPath);
      state.status.idea = "success";
      delete state.errors.idea;
    } catch (error) {
      state.status.idea = "failed";
      state.errors.idea = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-idea-result']");
  });
  bindAction(context.root, "verify-java-consumer", async () => {
    state.selectedPath = projectPath(context, state);
    state.status.javaConsumer = "loading";
    delete state.errors.javaConsumer;
    renderAndBind(context, state);
    try {
      state.javaConsumer = await verifyJavaConsumerEnvironment("Nacos", state.selectedPath);
      state.status.javaConsumer = "success";
      delete state.errors.javaConsumer;
    } catch (error) {
      state.status.javaConsumer = "failed";
      state.errors.javaConsumer = errorMessage(error);
    }
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='projects-java-consumer-result']");
  });
}

export async function refreshProject(context: FeatureContext, state: ProjectWorkbenchState): Promise<void> {
  state.selectedPath = projectPath(context, state);
  state.status.analysis = "loading";
  state.status.ports = "loading";
  state.status.traces = "loading";
  renderAndBind(context, state);
  const [analysis, ports, traces] = await Promise.allSettled([
    analyzeProject(state.selectedPath),
    inspectProjectPortConfigs(state.selectedPath),
    inspectAgentTraces(state.selectedPath),
  ]);
  if (!context.isCurrent()) return;
  state.errors = {};
  if (analysis.status === "fulfilled") {
    state.analysis = analysis.value;
    state.status.analysis = "success";
  } else {
    state.status.analysis = "failed";
    state.errors.analysis = errorMessage(analysis.reason);
  }
  if (ports.status === "fulfilled") {
    state.ports = ports.value;
    state.status.ports = ports.value.length ? "success" : "empty";
  } else {
    state.status.ports = "failed";
    state.errors.ports = errorMessage(ports.reason);
  }
  if (traces.status === "fulfilled") {
    state.traces = traces.value;
    state.status.traces = "success";
  } else {
    state.status.traces = "failed";
    state.errors.traces = errorMessage(traces.reason);
  }
  renderAndBind(context, state);
  revealResult(context.root, "[data-testid='projects-result']");
}

function projectPath(context: FeatureContext, state: ProjectWorkbenchState): string {
  const path = context.root.querySelector<HTMLInputElement>("#project-path")?.value.trim() || state.selectedPath;
  if (path) {
    rememberProjectPath(path);
    state.recentPaths = readRecentProjectPaths();
  }
  return path;
}

function rememberProjectPath(path: string): void {
  if (!path) return;
  try {
    localStorage.setItem("devenv.projects.selectedPath", path);
    const paths = [path, ...readRecentProjectPaths().filter((item) => item !== path)].slice(0, 8);
    localStorage.setItem("devenv.projects.recentPaths", JSON.stringify(paths));
  } catch {
    // Recent paths are optional and must never block project operations.
  }
}

export function readRecentProjectPaths(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("devenv.projects.recentPaths") || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];
  } catch {
    return [];
  }
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

function sameProjectPath(left: string, right: string): boolean {
  return left.trim().replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase()
    === right.trim().replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase();
}

function resetProjectResults(state: ProjectWorkbenchState): void {
  state.analysis = null;
  state.preview = null;
  state.ports = [];
  state.idea = null;
  state.javaConsumer = null;
  state.traces = null;
  state.applyResult = null;
  Object.keys(state.status).forEach((key) => {
    state.status[key as keyof typeof state.status] = "idle";
  });
  state.errors = {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
