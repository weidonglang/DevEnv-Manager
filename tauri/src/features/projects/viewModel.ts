import { localize, t } from "../../core/i18n";
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
      { label: localize("Root", "根目录"), value: present(analysis?.root || state.selectedPath) },
      { label: localize("Project types", "项目类型"), value: list(analysis?.projectTypes) },
      { label: localize("Detected files", "检测文件"), value: list(analysis?.detectedFiles) },
      { label: localize("Package manager", "包管理器"), value: present(analysis?.packageManager) },
      { label: localize("Warnings", "警告"), value: list(analysis?.warnings) },
    ],
    recommendedRuntimeRows: (analysis?.recommendedRuntime ?? []).map((runtime) => ({
      label: runtime.name,
      value: `${runtime.requirement} - ${runtime.status}`,
    })),
    actionRows: (analysis?.actions ?? []).map((action) => ({
      label: action.title,
      value: `${action.safeToRun ? localize("safe", "安全") : localize("review", "需检查")} - ${action.command || action.description}`,
    })),
    previewRows: state.preview
      ? [
          { label: localize("Project path", "项目路径"), value: state.preview.projectPath },
          { label: localize("Detected types", "检测类型"), value: list(state.preview.detectedTypes) },
          { label: localize("Files", "文件"), value: String(state.preview.files.length) },
          { label: localize("Current JDK", "当前 JDK"), value: present(state.preview.current.jdk) },
          { label: localize("Current Python", "当前 Python"), value: present(state.preview.current.python) },
          { label: localize("Warnings", "警告"), value: list(state.preview.warnings) },
        ]
      : [],
    previewFileRows: (state.preview?.files ?? []).map((file) => ({
      label: file.relativePath,
      value: `${file.existed ? localize("update", "更新") : localize("create", "创建")} - ${file.enabled ? localize("enabled", "启用") : localize("disabled", "禁用")}`,
    })),
    portRows: state.ports.map((port) => ({
      label: `${port.kind} ${port.currentPort}`,
      value: `${port.file}:${port.line} - ${port.description}`,
    })),
    ideaRows: state.idea
      ? [
          { label: localize("Root", "根目录"), value: state.idea.root },
          { label: localize("Detected", "已检测"), value: booleanLabel(state.idea.detected) },
          { label: localize("Project SDK", "项目 SDK"), value: present(state.idea.projectSdk) },
          { label: localize("Language level", "语言级别"), value: present(state.idea.languageLevel) },
          { label: localize("Modules", "模块"), value: String(state.idea.moduleCount) },
          { label: localize("JDK match", "JDK 匹配"), value: present(state.idea.jdkMatch) },
          { label: localize("Warnings", "警告"), value: list(state.idea.warnings) },
        ]
      : [],
    javaConsumerRows: state.javaConsumer
      ? [
          { label: localize("Consumer", "使用方"), value: state.javaConsumer.consumer },
          { label: localize("Root", "根目录"), value: state.javaConsumer.root },
          { label: localize("Usable", "可用"), value: booleanLabel(state.javaConsumer.usable) },
          { label: "JAVA_HOME raw", value: present(state.javaConsumer.javaHomeRaw) },
          { label: "JAVA_HOME expanded", value: present(state.javaConsumer.javaHomeExpanded) },
          { label: "java.exe", value: booleanLabel(state.javaConsumer.javaExists) },
          { label: "javac.exe", value: booleanLabel(state.javaConsumer.javacExists) },
          { label: localize("PATH java", "PATH 中的 java"), value: present(state.javaConsumer.pathJava) },
          { label: localize("Explanation", "说明"), value: list(state.javaConsumer.explanation) },
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
  return state.analysis.warnings.length ? localize("Needs review", "需要检查") : t("state.available");
}

function present(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || t("state.notAvailable");
}

function list(values: unknown[] | undefined): string {
  return values?.length ? values.map(String).join(", ") : t("state.notAvailable");
}

function booleanLabel(value: boolean): string {
  return value ? localize("yes", "是") : localize("no", "否");
}
