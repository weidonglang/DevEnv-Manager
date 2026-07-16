import { getActiveLocale, t } from "../../core/i18n";
import type { ToolchainWorkbenchState } from "./state";

export type ToolchainViewModel = {
  generatedAt: string;
  serviceCount: string;
  platformSummary: string;
  mysqlCandidateCount: string;
  detailRows: Array<{ label: string; value: string }>;
  platformRows: Array<{ label: string; value: string }>;
  mysqlRows: Array<{ label: string; value: string }>;
  serviceRows: Array<{ label: string; value: string }>;
};

export function toToolchainViewModel(state: ToolchainWorkbenchState): ToolchainViewModel {
  return {
    generatedAt: state.errors.report ? failed(state.errors.report) : formatTimestamp(state.report?.generatedAt),
    serviceCount: state.errors.services ? t("state.notAvailable") : state.services.length ? String(state.services.length) : noData(),
    platformSummary: state.errors.system ? failed(state.errors.system) : platformSummary(state),
    mysqlCandidateCount: state.errors.mysql ? t("state.notAvailable") : state.mysql ? String(state.mysql.candidates.length) : notChecked(),
    detailRows: [
      { label: label("Git status", "Git 状态"), value: toolStatus(state.report?.git.git) },
      { label: label("Git user", "Git 用户"), value: present(state.report?.git.userName) },
      { label: label("Git email", "Git 邮箱"), value: present(state.report?.git.userEmail) },
      { label: label("GitHub SSH", "GitHub SSH"), value: present(state.report?.git.githubSshStatus) },
      { label: label("GitHub HTTPS", "GitHub HTTPS"), value: present(state.report?.git.githubHttpsStatus) },
      { label: label("npm registry", "npm 源"), value: present(state.report?.node.npmRegistry) },
      { label: label("npm prefix", "npm 全局目录"), value: present(state.report?.node.npmPrefix) },
      { label: label("pnpm store", "pnpm 存储目录"), value: present(state.report?.node.pnpmStorePath) },
      { label: label("pip index", "PyPI 源"), value: present(state.report?.python.pipIndexUrl) },
      { label: label("pip config", "pip 配置"), value: present(state.report?.python.pipConfig) },
      { label: label("Generated at", "生成时间"), value: formatTimestamp(state.report?.generatedAt) },
    ],
    platformRows: [
      { label: label("Docker", "Docker"), value: toolStatus(state.system?.docker) },
      { label: label("WSL", "WSL"), value: toolStatus(state.system?.wsl) },
      { label: label("WSL distributions", "WSL 发行版"), value: list(state.system?.wslDistributions) },
      { label: label("Go", "Go"), value: toolStatus(state.platform?.go.go) },
      { label: label("GOPROXY", "GOPROXY"), value: present(state.platform?.go.goproxy) },
      { label: label("Rust toolchains", "Rust 工具链"), value: list(state.platform?.rust.installedToolchains) },
      { label: label(".NET SDKs", ".NET SDK"), value: list(state.platform?.dotnet.sdks) },
      { label: label("chsrc", "chsrc"), value: toolStatus(state.platform?.chsrc) },
    ],
    mysqlRows: state.mysqlPlan
      ? [
          { label: label("Plan", "计划"), value: state.mysqlPlan.title },
          { label: label("Candidate", "候选项"), value: state.mysqlPlan.candidateId },
          { label: label("Action", "动作"), value: state.mysqlPlan.action },
          { label: label("Risk", "风险"), value: state.mysqlPlan.riskLevel },
          { label: label("Requires admin", "需要管理员"), value: state.mysqlPlan.requiresAdmin ? t("state.yes") : t("state.no") },
          { label: label("Requires backup", "需要备份"), value: state.mysqlPlan.requiresBackup ? t("state.yes") : t("state.no") },
          { label: label("Fingerprint", "指纹"), value: state.mysqlPlan.planFingerprint },
          { label: label("Warnings", "警告"), value: list(state.mysqlPlan.warnings) },
          { label: label("Execution result", "执行结果"), value: state.mysqlResult ? `${state.mysqlResult.success ? t("state.yes") : t("state.no")} - ${state.mysqlResult.message}` : notChecked() },
        ]
      : [
          { label: label("Generated at", "生成时间"), value: formatTimestamp(state.mysql?.generatedAt) },
          { label: label("Candidates", "候选项"), value: state.mysql ? String(state.mysql.candidates.length) : notChecked() },
          { label: label("Conclusion", "结论"), value: mysqlConclusion(state) },
          { label: label("Warnings", "警告"), value: list(state.mysql?.warnings) },
          { label: label("Privacy", "隐私说明"), value: present(state.mysql?.privacyNotice) },
        ],
    serviceRows: state.services.slice(0, 10).map((service) => ({
      label: `${service.name} :${service.port}`,
      value: `${service.installed ? label("installed", "已安装") : label("not installed", "未安装")} - ${service.serviceState || service.processName || noData()}`,
    })),
  };
}

function platformSummary(state: ToolchainWorkbenchState): string {
  if (!state.system && !state.platform) return notChecked();
  const installed = [state.system?.docker.installed, state.system?.wsl.installed, state.platform?.go.go.installed, state.platform?.dotnet.dotnet.installed].filter(Boolean).length;
  return `${installed} / 4`;
}

function mysqlConclusion(state: ToolchainWorkbenchState): string {
  if (!state.mysql) return notChecked();
  if (!state.mysql.candidates.length) return label("No MySQL candidates found.", "暂无 MySQL 候选。");
  return state.mysql.candidates.map((candidate) => `${candidate.serviceName || candidate.id}: ${candidate.status || candidate.dataHealth || candidate.confidence}`).join("; ");
}

function toolStatus(tool: { installed: boolean; version: string; path: string; detail: string } | undefined): string {
  if (!tool) return notChecked();
  if (!tool.installed) return label("Not installed", "未安装");
  return [label("Available", "可用"), tool.version, tool.path].filter(Boolean).join(" - ");
}

function formatTimestamp(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return notChecked();
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    const millis = number < 10_000_000_000 ? number * 1000 : number;
    return new Date(millis).toLocaleString();
  }
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
  if (text.startsWith("SystemTime")) return label("Legacy debug timestamp", "旧版调试时间戳");
  return text;
}

function present(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || noData();
}

function list(values: unknown[] | undefined): string {
  return values?.length ? values.map(String).join(", ") : noData();
}

function notChecked(): string {
  return label("Not checked yet", "尚未检查");
}

function noData(): string {
  return label("No data", "暂无数据");
}

function failed(error: string): string {
  return label(`Check failed: ${error}`, `检查失败：${error}`);
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
