import { writeActiveView, type WorkbenchView } from "./state";

export type RouteTarget = {
  id: WorkbenchView;
  label: string;
};

export const workbenchRoutes: RouteTarget[] = [
  { id: "overview", label: "Dashboard" },
  { id: "runtimes", label: "Runtimes" },
  { id: "environment", label: "Environment" },
  { id: "project", label: "Projects" },
  { id: "ports", label: "Ports & Services" },
  { id: "toolbox", label: "File Associations" },
  { id: "maintenance", label: "Cleanup" },
  { id: "toolchains", label: "Toolchains" },
  { id: "platforms", label: "Profiles" },
  { id: "learning", label: "Reports" },
  { id: "doctor", label: "Settings" },
];

export function navigateTo(view: WorkbenchView): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-view="${view}"]`);
  if (button) {
    button.click();
    writeActiveView(view);
  }
}
