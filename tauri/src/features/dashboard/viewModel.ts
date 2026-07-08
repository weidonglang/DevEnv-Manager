import { t } from "../../core/i18n";
import type { EnvHealthCheck } from "../../types";
import type { DashboardState } from "./state";

export type DashboardViewModel = {
  rootDirectory: string;
  discoveredTools: string;
  pathWarnings: string;
  pathWarningsDetail: string;
  jdkStatus: string;
  jdkDetail: string;
  pythonStatus: string;
  pythonDetail: string;
  powershellRunner: string;
  powershellDetail: string;
  updateStatus: string;
  updateDetail: string;
  environmentRows: Array<{ label: string; value: string }>;
};

export function toDashboardViewModel(state: DashboardState): DashboardViewModel {
  const path = findHealth(state.health, "PATH");
  const jdk = findHealth(state.health, "JDK") ?? findHealth(state.health, "JAVA_HOME");
  const python = findHealth(state.health, "Python");
  return {
    rootDirectory: state.snapshot?.defaultRoot || t("state.notAvailable"),
    discoveredTools: state.errors.health ? t("state.notAvailable") : String(state.health.length),
    pathWarnings: state.errors.health ? t("state.notAvailable") : path?.status || t("state.notChecked"),
    pathWarningsDetail: state.errors.health || path?.detail || "",
    jdkStatus: state.errors.health ? t("state.notAvailable") : jdk?.status || t("state.notChecked"),
    jdkDetail: state.errors.health || jdk?.detail || "",
    pythonStatus: state.errors.health ? t("state.notAvailable") : python?.status || t("state.notChecked"),
    pythonDetail: state.errors.health || python?.detail || "",
    powershellRunner: powershellStatus(state),
    powershellDetail: powershellDetail(state),
    updateStatus: state.errors.update ? t("state.notAvailable") : state.update?.latestVersion || t("state.notChecked"),
    updateDetail: state.errors.update || state.update?.sourceName || "",
    environmentRows: [
      { label: "defaultRoot", value: state.snapshot?.defaultRoot || t("state.notAvailable") },
      { label: "configDir", value: state.snapshot?.configDir || t("state.notAvailable") },
      { label: "os", value: state.snapshot?.os || t("state.notAvailable") },
      { label: "arch", value: state.snapshot?.arch || t("state.notAvailable") },
      { label: "username", value: state.snapshot?.username || t("state.notAvailable") },
    ],
  };
}

function findHealth(items: EnvHealthCheck[], name: string): EnvHealthCheck | undefined {
  const lower = name.toLowerCase();
  return items.find((item) => item.name.toLowerCase().includes(lower));
}

function powershellStatus(state: DashboardState): string {
  if (state.errors.powershell) return t("state.notAvailable");
  if (!state.powershell) return t("state.notChecked");
  if (state.powershell.timedOut) return "Timed out";
  return state.powershell.success ? t("state.available") : "Failed";
}

function powershellDetail(state: DashboardState): string {
  if (state.errors.powershell) return state.errors.powershell;
  if (!state.powershell) return "";
  return `${state.powershell.executable} - ${state.powershell.elapsedMs}ms`;
}
