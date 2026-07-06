import { writeActiveView, type WorkbenchView } from "./state";
import { t, type TranslationKey } from "../core/i18n";

export type RouteTarget = {
  id: WorkbenchView;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: string;
};

export const workbenchRoutes: RouteTarget[] = [
  { id: "dashboard", labelKey: "route.dashboard.label", descriptionKey: "route.dashboard.description", icon: "D" },
  { id: "runtimes", labelKey: "route.runtimes.label", descriptionKey: "route.runtimes.description", icon: "R" },
  { id: "environment", labelKey: "route.environment.label", descriptionKey: "route.environment.description", icon: "E" },
  { id: "projects", labelKey: "route.projects.label", descriptionKey: "route.projects.description", icon: "P" },
  { id: "ports", labelKey: "route.ports.label", descriptionKey: "route.ports.description", icon: "PS" },
  { id: "fileAssociations", labelKey: "route.fileAssociations.label", descriptionKey: "route.fileAssociations.description", icon: "FA" },
  { id: "cleanup", labelKey: "route.cleanup.label", descriptionKey: "route.cleanup.description", icon: "C" },
  { id: "toolchains", labelKey: "route.toolchains.label", descriptionKey: "route.toolchains.description", icon: "T" },
  { id: "profiles", labelKey: "route.profiles.label", descriptionKey: "route.profiles.description", icon: "PR" },
  { id: "reports", labelKey: "route.reports.label", descriptionKey: "route.reports.description", icon: "RP" },
  { id: "settings", labelKey: "route.settings.label", descriptionKey: "route.settings.description", icon: "S" },
];

export function navigateTo(view: WorkbenchView): void {
  writeActiveView(view);
  window.dispatchEvent(new CustomEvent("devenv:navigate", { detail: view }));
}

export function routeLabel(route: RouteTarget): string {
  return t(route.labelKey);
}

export function routeDescription(route: RouteTarget): string {
  return t(route.descriptionKey);
}
