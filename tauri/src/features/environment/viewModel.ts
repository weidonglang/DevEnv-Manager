import { getActiveLocale, t } from "../../core/i18n";
import { localizeBackendText } from "../../core/backendText";
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
      { label: label("User JAVA_HOME raw", "用户 JAVA_HOME 原始值"), value: envValue(reliability?.userEnv.javaHomeRaw) },
      { label: label("User JAVA_HOME expanded", "用户 JAVA_HOME 展开值"), value: envValue(reliability?.userEnv.javaHomeExpanded) },
      { label: label("Process JAVA_HOME raw", "进程 JAVA_HOME 原始值"), value: envValue(reliability?.processEnv.javaHomeRaw) },
      { label: label("Process JAVA_HOME expanded", "进程 JAVA_HOME 展开值"), value: envValue(reliability?.processEnv.javaHomeExpanded) },
      { label: label("PATH first java", "PATH 首个 java"), value: toolPath(reliability?.java.pathJava || reliability?.effectiveTools.java.path, "java") },
      { label: label("PATH first javac", "PATH 首个 javac"), value: toolPath(reliability?.java.pathJavac || reliability?.effectiveTools.javac.path, "javac") },
      { label: label("Java consistency", "Java 一致性"), value: present(reliability?.java.consistency) },
      { label: label("External Java candidates", "外部 Java 候选"), value: String(reliability?.java.candidates.length ?? 0) },
      { label: label("JAVA_HOME and PATH match", "JAVA_HOME 与 PATH 是否一致"), value: javaHomePathMatch(reliability) },
      { label: label("Generated at", "生成时间"), value: present(reliability?.generatedAt) },
    ],
    pathRows: [
      { label: label("Duplicate PATH entries", "重复 PATH 条目"), value: String(reliability?.pathAnalysis.duplicateCount ?? 0) },
      { label: label("Missing PATH entries", "失效 PATH 条目"), value: String(reliability?.pathAnalysis.missingCount ?? 0) },
      { label: label("Stale DevEnv entries", "陈旧 DevEnv 条目"), value: String(reliability?.pathAnalysis.staleDevenvCount ?? 0) },
      { label: label("Store alias risk", "Store 别名风险"), value: booleanLabel(Boolean(reliability?.pathAnalysis.storeAliasDetected || reliability?.python.storeAliasRisk)) },
      { label: label("PATH too long", "PATH 是否过长"), value: booleanLabel(Boolean(reliability?.pathAnalysis.pathTooLong)) },
      { label: label("Total entries", "条目总数"), value: String(reliability?.pathAnalysis.totalEntries ?? 0) },
    ],
    issueRows: (reliability?.issues ?? []).map((issue) => ({ label: `${issue.severity}: ${localizeBackendText(issue.title)}`, value: localizeBackendText(issue.detail) })),
  };
}

function javaHomePathMatch(reliability: EnvReliabilitySnapshot | null): string {
  if (!reliability) return t("state.notChecked");
  const home = reliability.java.javaHomeExpanded || reliability.userEnv.javaHomeExpanded || "";
  const pathJava = reliability.java.pathJava || reliability.effectiveTools.java.path || "";
  if (!home && !pathJava) return label("No JAVA_HOME or PATH java detected", "未检测到 JAVA_HOME 或 PATH java");
  if (!home) return label("External Java is on PATH, but JAVA_HOME is not configured", "PATH 中有外部 Java，但 JAVA_HOME 未配置");
  if (!pathJava) return label("JAVA_HOME is configured, but java is not found on PATH", "JAVA_HOME 已配置，但 PATH 中未找到 java");
  const normalizedHome = home.replace(/\//g, "\\").toLowerCase();
  const normalizedJava = pathJava.replace(/\//g, "\\").toLowerCase();
  return normalizedJava.startsWith(normalizedHome) ? t("state.yes") : label("No - PATH java points elsewhere", "否 - PATH java 指向其他位置");
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
