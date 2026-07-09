import type { ConfigView, PowerShellResult, UpdateCheckResult } from "../../types";
import type { ThemeMode } from "../../ui/theme/controller";

export type SettingsWorkbenchState = {
  config: ConfigView | null;
  powershell: PowerShellResult | null;
  update: UpdateCheckResult | null;
  theme: ThemeMode;
  operationResult: string;
  operationError: string;
  debugPage: number;
  errors: Partial<Record<"config" | "powershell" | "update", string>>;
};

export const settingsWorkbenchInitialState: SettingsWorkbenchState = {
  config: null,
  powershell: null,
  update: null,
  theme: "system",
  operationResult: "",
  operationError: "",
  debugPage: 1,
  errors: {},
};
