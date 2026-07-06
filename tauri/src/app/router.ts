import { writeActiveView, type WorkbenchView } from "./state";

export type RouteTarget = {
  id: WorkbenchView;
  label: string;
  description: string;
  icon: string;
};

export const workbenchRoutes: RouteTarget[] = [
  { id: "dashboard", label: "Dashboard", description: "Health summary and safe shortcuts.", icon: "D" },
  { id: "runtimes", label: "Runtimes", description: "JDK, Node.js, Python, Go, Maven, and Gradle.", icon: "R" },
  { id: "environment", label: "Environment", description: "JAVA_HOME, PATH, Maven, Gradle, and backups.", icon: "E" },
  { id: "projects", label: "Projects", description: "Project health, config preview, and ports.", icon: "P" },
  { id: "ports", label: "Ports & Services", description: "Port owners, local services, and resolution plans.", icon: "PS" },
  { id: "fileAssociations", label: "File Associations", description: "Extensions, app candidates, plans, and rollback.", icon: "FA" },
  { id: "cleanup", label: "Cleanup", description: "Storage cleanup, move plans, and rollback.", icon: "C" },
  { id: "toolchains", label: "Toolchains", description: "Toolchains, platforms, services, and MySQL repair.", icon: "T" },
  { id: "profiles", label: "Profiles", description: "Configuration profile plans and imports.", icon: "PR" },
  { id: "reports", label: "Reports", description: "Doctor and exportable diagnostics.", icon: "RP" },
  { id: "settings", label: "Settings", description: "Root directory, updates, theme, and app config.", icon: "S" },
];

export function navigateTo(view: WorkbenchView): void {
  writeActiveView(view);
  window.dispatchEvent(new CustomEvent("devenv:navigate", { detail: view }));
}
