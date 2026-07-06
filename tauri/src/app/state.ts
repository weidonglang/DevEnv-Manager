import { readJson, writeJson } from "../core/storage";

export type WorkbenchView =
  | "dashboard"
  | "runtimes"
  | "environment"
  | "projects"
  | "ports"
  | "fileAssociations"
  | "cleanup"
  | "toolchains"
  | "profiles"
  | "reports"
  | "settings";

const ACTIVE_VIEW_KEY = "devenv-manager.active-view";

export function readActiveView(): WorkbenchView {
  const saved = readJson<string>(ACTIVE_VIEW_KEY, "dashboard");
  return normalizeWorkbenchView(saved);
}

export function writeActiveView(view: WorkbenchView): void {
  writeJson(ACTIVE_VIEW_KEY, view);
}

export function normalizeWorkbenchView(value: string): WorkbenchView {
  const aliases: Record<string, WorkbenchView> = {
    overview: "dashboard",
    doctor: "settings",
    project: "projects",
    toolbox: "fileAssociations",
    maintenance: "cleanup",
    platforms: "profiles",
    learning: "reports",
  };
  const normalized = aliases[value] ?? value;
  const allowed: WorkbenchView[] = [
    "dashboard",
    "runtimes",
    "environment",
    "projects",
    "ports",
    "fileAssociations",
    "cleanup",
    "toolchains",
    "profiles",
    "reports",
    "settings",
  ];
  return allowed.includes(normalized as WorkbenchView) ? (normalized as WorkbenchView) : "dashboard";
}
