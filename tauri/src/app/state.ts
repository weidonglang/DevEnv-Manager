import { readJson, writeJson } from "../core/storage";

export type WorkbenchView =
  | "overview"
  | "doctor"
  | "runtimes"
  | "environment"
  | "project"
  | "ports"
  | "toolbox"
  | "maintenance"
  | "toolchains"
  | "platforms"
  | "learning";

const ACTIVE_VIEW_KEY = "devenv-manager.active-view";

export function readActiveView(): WorkbenchView {
  return readJson<WorkbenchView>(ACTIVE_VIEW_KEY, "overview");
}

export function writeActiveView(view: WorkbenchView): void {
  writeJson(ACTIVE_VIEW_KEY, view);
}
