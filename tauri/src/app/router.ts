import { writeActiveView, type WorkbenchView } from "./state";

export type RouteTarget = {
  id: WorkbenchView;
  label: string;
};

export const workbenchRoutes: RouteTarget[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "runtimes", label: "Runtimes" },
  { id: "environment", label: "Environment" },
  { id: "projects", label: "Projects" },
  { id: "ports", label: "Ports & Services" },
  { id: "fileAssociations", label: "File Associations" },
  { id: "cleanup", label: "Cleanup" },
  { id: "toolchains", label: "Toolchains" },
  { id: "profiles", label: "Profiles" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

export function navigateTo(view: WorkbenchView): void {
  writeActiveView(view);
  window.dispatchEvent(new CustomEvent("devenv:navigate", { detail: view }));
}
