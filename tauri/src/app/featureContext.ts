import type { invoke } from "../core/invoke";
import type { RiskOperationView, RunRiskOperation } from "../core/risk";
import type { WorkbenchView } from "./state";

export type ToastController = (message: string, danger?: boolean) => void;

export type ProgressController = {
  start: (message: string) => void;
  done: (message: string) => void;
  fail: (message: string) => void;
};

export type RiskController = {
  run: RunRiskOperation;
};

export type FeatureContext = {
  root: HTMLElement;
  invoke: typeof invoke;
  toast: ToastController;
  risk: RiskController;
  navigate: (view: WorkbenchView) => void;
  progress: ProgressController;
};

export type FeatureModule = (context: FeatureContext) => void | Promise<void>;

export function createFeatureContext(context: FeatureContext): FeatureContext {
  return context;
}

export type FeatureAction = {
  id: string;
  label: string;
  view: WorkbenchView;
  selector?: string;
  safe?: boolean;
  risk?: Pick<RiskOperationView, "command" | "riskLevel">;
};
