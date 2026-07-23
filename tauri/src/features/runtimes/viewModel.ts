import { localize, t } from "../../core/i18n";
import { localizeBackendText } from "../../core/backendText";
import type { RuntimeInfo, RuntimeStrongVerificationReport, RuntimeVerificationCheck } from "../../types";
import type { RuntimeWorkbenchState } from "./state";

export type RuntimeRowViewModel = {
  id: string;
  kind: string;
  backendKind: string;
  ecosystem: string;
  version: string;
  executable: string;
  runtimeRoot: string;
  source: string;
  managed: boolean;
  readonlyLabel: string;
  current: boolean;
  currentLabel: string;
  status: string;
  installedAt: string;
  checks: RuntimeVerificationCheck[];
};

export type RuntimeGroupViewModel = {
  id: string;
  label: string;
  managed: RuntimeRowViewModel[];
  external: RuntimeRowViewModel[];
  current: RuntimeRowViewModel[];
};

export type RuntimeViewModel = {
  rows: RuntimeRowViewModel[];
  groups: RuntimeGroupViewModel[];
  verification: string;
  verificationDetail: string;
};

const GROUPS = [
  ["java", "Java / JDK"],
  ["python", "Python"],
  ["node", "Node.js"],
  ["go", "Go"],
  ["maven", "Maven"],
  ["gradle", "Gradle"],
  ["rust", "Rust / Cargo / rustup"],
  ["dotnet", ".NET SDK"],
  ["other", "Other tools"],
] as const;

export function toRuntimeViewModel(state: RuntimeWorkbenchState): RuntimeViewModel {
  const rows = state.runtimes.map((runtime) => toRuntimeRow(runtime, state.strongVerification));
  const groups = GROUPS.map(([id, label]) => {
    const groupRows = rows.filter((runtime) => runtime.ecosystem === id);
    return {
      id,
      label,
      managed: groupRows.filter((runtime) => runtime.managed),
      external: groupRows.filter((runtime) => !runtime.managed),
      current: groupRows.filter((runtime) => runtime.current),
    };
  });
  return {
    rows,
    groups,
    verification: verificationSummary(state.strongVerification),
    verificationDetail: localizeBackendText(state.strongVerification?.summary.join(" - ") || ""),
  };
}

function toRuntimeRow(runtime: RuntimeInfo, report: RuntimeStrongVerificationReport | null): RuntimeRowViewModel {
  const item = report?.items.find((candidate) => candidate.runtimeId === runtime.id);
  const managed = runtime.management === "managed";
  const current = runtime.current || Boolean(item?.current);
  return {
    id: runtime.id,
    kind: runtime.displayName,
    backendKind: runtime.kind,
    ecosystem: runtime.ecosystem,
    version: runtime.version,
    executable: runtime.executable,
    runtimeRoot: runtime.runtimeRoot,
    source: runtime.source,
    managed,
    readonlyLabel: managed ? localize("DevEnv managed", "DevEnv 受管") : localize("External install / read-only", "外部安装 / 只读"),
    current,
    currentLabel: current ? localize("Current", "当前生效") : managed ? localize("Installed, not current", "已安装，未切换") : localize("Discovered", "已发现"),
    status: localizeBackendText(item?.status || (managed ? t("state.notChecked") : localize("Read-only", "只读"))),
    installedAt: runtime.installedAt || t("state.notAvailable"),
    checks: item?.checks ?? [],
  };
}

function verificationSummary(report: RuntimeStrongVerificationReport | null): string {
  if (!report) return t("state.notChecked");
  const failed = report.items.filter((item) => item.checks.some((check) => check.required && check.status !== "passed")).length;
  const usable = report.items.length - failed;
  return localize(`${usable}/${report.items.length} usable`, `${usable}/${report.items.length} 可用`);
}
