import { getActiveLocale, t } from "../../core/i18n";
import type { EnvReliabilitySnapshot } from "../../types";
import type { EnvironmentWorkbenchState } from "./state";

export type EnvironmentViewModel = {
  javaHomeRaw: string;
  javaHomeExpanded: string;
  processJavaHome: string;
  pathFirstJava: string;
  pathFirstJavac: string;
  pathWarnings: string;
  pathWarningDetail: string;
  backupCount: string;
  detailRows: Array<{ label: string; value: string }>;
  pathRows: Array<{ label: string; value: string }>;
  issueRows: Array<{ label: string; value: string }>;
};

export function toEnvironmentViewModel(state: EnvironmentWorkbenchState): EnvironmentViewModel {
  const reliability = state.reliability;
  const pathWarnings = pathWarningSummary(reliability);
  return {
    javaHomeRaw: envValue(reliability?.userEnv.javaHomeRaw),
    javaHomeExpanded: envValue(reliability?.userEnv.javaHomeExpanded),
    processJavaHome: processJavaHome(reliability),
    pathFirstJava: toolPath(reliability?.java.pathJava || reliability?.effectiveTools.java.path, "java"),
    pathFirstJavac: toolPath(reliability?.java.pathJavac || reliability?.effectiveTools.javac.path, "javac"),
    pathWarnings: state.errors.reliability ? t("state.notAvailable") : pathWarnings.value,
    pathWarningDetail: state.errors.reliability || pathWarnings.detail,
    backupCount: String(state.envBackups.length + state.environmentBackups.length),
    detailRows: [
      { label: "User JAVA_HOME raw", value: envValue(reliability?.userEnv.javaHomeRaw) },
      { label: "User JAVA_HOME expanded", value: envValue(reliability?.userEnv.javaHomeExpanded) },
      { label: "Process JAVA_HOME raw", value: envValue(reliability?.processEnv.javaHomeRaw) },
      { label: "Process JAVA_HOME expanded", value: envValue(reliability?.processEnv.javaHomeExpanded) },
      { label: "PATH first java", value: toolPath(reliability?.java.pathJava || reliability?.effectiveTools.java.path, "java") },
      { label: "PATH first javac", value: toolPath(reliability?.java.pathJavac || reliability?.effectiveTools.javac.path, "javac") },
      { label: "Java consistency", value: present(reliability?.java.consistency) },
      { label: "Generated at", value: present(reliability?.generatedAt) },
    ],
    pathRows: [
      { label: "Duplicate PATH entries", value: String(reliability?.pathAnalysis.duplicateCount ?? 0) },
      { label: "Missing PATH entries", value: String(reliability?.pathAnalysis.missingCount ?? 0) },
      { label: "Stale DevEnv entries", value: String(reliability?.pathAnalysis.staleDevenvCount ?? 0) },
      { label: "Store alias risk", value: booleanLabel(Boolean(reliability?.pathAnalysis.storeAliasDetected || reliability?.python.storeAliasRisk)) },
      { label: "PATH too long", value: booleanLabel(Boolean(reliability?.pathAnalysis.pathTooLong)) },
      { label: "Total entries", value: String(reliability?.pathAnalysis.totalEntries ?? 0) },
    ],
    issueRows: (reliability?.issues ?? []).map((issue) => ({ label: `${issue.severity}: ${issue.title}`, value: issue.detail })),
  };
}

function processJavaHome(reliability: EnvReliabilitySnapshot | null): string {
  const raw = reliability?.processEnv.javaHomeRaw;
  const expanded = reliability?.processEnv.javaHomeExpanded;
  if (raw && expanded && raw !== expanded) return `${raw} -> ${expanded}`;
  return envValue(expanded || raw);
}

function pathWarningSummary(reliability: EnvReliabilitySnapshot | null): { value: string; detail: string } {
  if (!reliability) return { value: t("state.notChecked"), detail: "" };
  const path = reliability.pathAnalysis;
  const warningCount = path.duplicateCount + path.missingCount + path.staleDevenvCount + Number(path.storeAliasDetected) + Number(path.pathTooLong);
  const detail = [
    label(`Duplicate entries: ${path.duplicateCount}`, `重复项：${path.duplicateCount}`),
    label(`Missing entries: ${path.missingCount}`, `失效项：${path.missingCount}`),
    label(`Stale DevEnv entries: ${path.staleDevenvCount}`, `旧 DevEnv 项：${path.staleDevenvCount}`),
    label(`Store alias risk: ${booleanLabel(path.storeAliasDetected)}`, `Store 别名风险：${booleanLabel(path.storeAliasDetected)}`),
    label(`PATH too long: ${booleanLabel(path.pathTooLong)}`, `PATH 过长：${booleanLabel(path.pathTooLong)}`),
  ].join("; ");
  return { value: warningCount ? label(`${warningCount} warnings`, `${warningCount} 个警告`) : t("state.available"), detail };
}

function present(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || t("state.notAvailable");
}

function envValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || label("Not set", "未设置");
}

function toolPath(value: unknown, tool: string): string {
  const text = String(value ?? "").trim();
  return text || label(`${tool} not found on PATH`, `PATH 中未找到 ${tool}`);
}

function booleanLabel(value: boolean): string {
  return value ? label("yes", "是") : label("no", "否");
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
