import { localize, t } from "../../core/i18n";
import { localizeBackendText } from "../../core/backendText";
import type { RuntimeInfo, RuntimeStrongVerificationReport } from "../../types";
import type { RuntimeWorkbenchState } from "./state";

export type RuntimeRowViewModel = {
  id: string;
  kind: string;
  backendKind: string;
  version: string;
  executable: string;
  runtimeRoot: string;
  source: string;
  managed: boolean;
  readonlyLabel: string;
  current: string;
  status: string;
};

export type RuntimeViewModel = {
  rows: RuntimeRowViewModel[];
  verification: string;
  verificationDetail: string;
};

export function toRuntimeViewModel(state: RuntimeWorkbenchState): RuntimeViewModel {
  const rows = state.runtimes.map((runtime, index) => toRuntimeRow(runtime, state.strongVerification, index));
  return {
    rows,
    verification: verificationSummary(state.strongVerification),
    verificationDetail: localizeBackendText(state.strongVerification?.summary.join(" - ") || ""),
  };
}

function toRuntimeRow(runtime: RuntimeInfo, report: RuntimeStrongVerificationReport | null, index: number): RuntimeRowViewModel {
  const item = report?.items.find((candidate) => sameRuntime(candidate.kind, runtime.kind) && (samePath(candidate.path, runtime.executable) || runtime.version.includes(candidate.version) || candidate.version.includes(runtime.version)));
  const managed = runtime.source.toLowerCase().includes("devenv managed");
  return {
    id: `runtime-${index}`,
    kind: runtime.kind,
    backendKind: backendRuntimeKind(runtime.kind),
    version: runtime.version,
    executable: runtime.executable,
    runtimeRoot: runtimeRoot(runtime.executable),
    source: runtime.source,
    managed,
    readonlyLabel: managed ? t("state.available") : localize("External install / read-only", "外部安装 / 只读"),
    current: item?.current ? localize("Current", "当前") : managed ? localize("Managed", "受管") : localize("External", "外部"),
    status: localizeBackendText(item?.status || (managed ? t("state.notChecked") : localize("Read-only", "只读"))),
  };
}

function verificationSummary(report: RuntimeStrongVerificationReport | null): string {
  if (!report) return t("state.notChecked");
  const failed = report.items.filter((item) => item.status.toLowerCase().includes("fail") || item.checks.some((check) => !check.success && check.required)).length;
  const usable = report.items.length - failed;
  return localize(`${usable}/${report.items.length} usable`, `${usable}/${report.items.length} 可用`);
}

function runtimeRoot(executable: string): string {
  const normalized = executable.replace(/\//g, "\\");
  const parts = normalized.split("\\").filter(Boolean);
  if (parts.length <= 1) return executable;
  const file = parts[parts.length - 1] || "";
  const parent = parts[parts.length - 2] || "";
  const rootParts = ["bin", "scripts"].includes(parent.toLowerCase()) && parts.length > 2 ? parts.slice(0, -2) : parts.slice(0, -1);
  const prefix = normalized.startsWith("\\\\") ? "\\\\" : normalized.match(/^[A-Za-z]:\\/) ? "" : normalized.startsWith("\\") ? "\\" : "";
  const joined = rootParts.join("\\");
  return file ? `${prefix}${joined}` : executable;
}

function sameRuntime(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || (a === "java" && b === "jdk") || (a === "jdk" && b === "java") || a.includes(b) || b.includes(a);
}

function samePath(left: string, right: string): boolean {
  return left.replace(/\//g, "\\").toLowerCase() === right.replace(/\//g, "\\").toLowerCase();
}

function backendRuntimeKind(kind: string): string {
  const normalized = kind.toLowerCase();
  if (normalized.includes("java") || normalized.includes("jdk")) return "jdk";
  if (normalized.includes("python")) return "python";
  if (normalized.includes("node")) return "node";
  if (normalized.includes("maven")) return "maven";
  if (normalized.includes("gradle")) return "gradle";
  if (normalized === "go" || normalized.includes("golang")) return "go";
  return normalized;
}
