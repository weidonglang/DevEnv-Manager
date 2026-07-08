import { t } from "../../core/i18n";
import type { ProjectWorkbenchState } from "./state";

export type ProjectViewModel = {
  health: string;
  signals: string;
  ports: string;
  traces: string;
  analysisRows: Array<{ label: string; value: string }>;
  recommendedRuntimeRows: Array<{ label: string; value: string }>;
  actionRows: Array<{ label: string; value: string }>;
  previewRows: Array<{ label: string; value: string }>;
  previewFileRows: Array<{ label: string; value: string }>;
  portRows: Array<{ label: string; value: string }>;
  ideaRows: Array<{ label: string; value: string }>;
  javaConsumerRows: Array<{ label: string; value: string }>;
  traceRows: Array<{ label: string; value: string }>;
};

export function toProjectViewModel(state: ProjectWorkbenchState): ProjectViewModel {
  const analysis = state.analysis;
  return {
    health: healthLabel(state),
    signals: analysis ? String(analysis.detectedFiles.length + analysis.actions.length + analysis.warnings.length) : t("state.notChecked"),
    ports: state.errors.ports ? t("state.notAvailable") : String(state.ports.length),
    traces: state.errors.traces ? t("state.notAvailable") : String(state.traces?.items.length ?? 0),
    analysisRows: [
      { label: "Root", value: present(analysis?.root || state.selectedPath) },
      { label: "Project types", value: list(analysis?.projectTypes) },
      { label: "Detected files", value: list(analysis?.detectedFiles) },
      { label: "Package manager", value: present(analysis?.packageManager) },
      { label: "Warnings", value: list(analysis?.warnings) },
    ],
    recommendedRuntimeRows: (analysis?.recommendedRuntime ?? []).map((runtime) => ({
      label: runtime.name,
      value: `${runtime.requirement} - ${runtime.status}`,
    })),
    actionRows: (analysis?.actions ?? []).map((action) => ({
      label: action.title,
      value: `${action.safeToRun ? "safe" : "review"} - ${action.command || action.description}`,
    })),
    previewRows: state.preview
      ? [
          { label: "Project path", value: state.preview.projectPath },
          { label: "Detected types", value: list(state.preview.detectedTypes) },
          { label: "Files", value: String(state.preview.files.length) },
          { label: "Current JDK", value: present(state.preview.current.jdk) },
          { label: "Current Python", value: present(state.preview.current.python) },
          { label: "Warnings", value: list(state.preview.warnings) },
        ]
      : [],
    previewFileRows: (state.preview?.files ?? []).map((file) => ({
      label: file.relativePath,
      value: `${file.existed ? "update" : "create"} - ${file.enabled ? "enabled" : "disabled"}`,
    })),
    portRows: state.ports.map((port) => ({
      label: `${port.kind} ${port.currentPort}`,
      value: `${port.file}:${port.line} - ${port.description}`,
    })),
    ideaRows: state.idea
      ? [
          { label: "Root", value: state.idea.root },
          { label: "Detected", value: booleanLabel(state.idea.detected) },
          { label: "Project SDK", value: present(state.idea.projectSdk) },
          { label: "Language level", value: present(state.idea.languageLevel) },
          { label: "Modules", value: String(state.idea.moduleCount) },
          { label: "JDK match", value: present(state.idea.jdkMatch) },
          { label: "Warnings", value: list(state.idea.warnings) },
        ]
      : [],
    javaConsumerRows: state.javaConsumer
      ? [
          { label: "Consumer", value: state.javaConsumer.consumer },
          { label: "Root", value: state.javaConsumer.root },
          { label: "Usable", value: booleanLabel(state.javaConsumer.usable) },
          { label: "JAVA_HOME raw", value: present(state.javaConsumer.javaHomeRaw) },
          { label: "JAVA_HOME expanded", value: present(state.javaConsumer.javaHomeExpanded) },
          { label: "java.exe", value: booleanLabel(state.javaConsumer.javaExists) },
          { label: "javac.exe", value: booleanLabel(state.javaConsumer.javacExists) },
          { label: "PATH java", value: present(state.javaConsumer.pathJava) },
          { label: "Explanation", value: list(state.javaConsumer.explanation) },
        ]
      : [],
    traceRows: (state.traces?.items ?? []).map((trace) => ({
      label: `${trace.source} - ${trace.confidence}`,
      value: `${trace.path} - ${trace.recommendation}`,
    })),
  };
}

function healthLabel(state: ProjectWorkbenchState): string {
  if (state.errors.analysis) return t("state.notAvailable");
  if (!state.analysis) return t("state.notChecked");
  return state.analysis.warnings.length ? "Needs review" : t("state.available");
}

function present(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || t("state.notAvailable");
}

function list(values: unknown[] | undefined): string {
  return values?.length ? values.map(String).join(", ") : t("state.notAvailable");
}

function booleanLabel(value: boolean): string {
  return value ? "yes" : "no";
}
