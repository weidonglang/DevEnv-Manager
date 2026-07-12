import { invoke } from "../../core/invoke";
import type { ConfigView, OperationResult, PowerShellResult, UpdateCheckResult, UpdateDownloadResult } from "../../types";

export function loadSettingsWorkbench(): Promise<ConfigView> {
  return invoke<ConfigView>("load_config");
}

export function setRootDir(root: string): Promise<ConfigView> {
  return invoke<ConfigView>("set_root_dir", { root });
}

export function setAutoCheckUpdate(enabled: boolean): Promise<ConfigView> {
  return invoke<ConfigView>("set_auto_check_update", { enabled });
}

export function openAppConfigDir(): Promise<OperationResult> {
  return invoke<OperationResult>("open_app_config_dir");
}

export function resetUiConfig(): Promise<OperationResult> {
  return invoke<OperationResult>("reset_ui_config");
}

export function powershellRunnerStatus(): Promise<PowerShellResult> {
  return invoke<PowerShellResult>("powershell_runner_status");
}

export function checkForUpdates(): Promise<UpdateCheckResult> {
  return invoke<UpdateCheckResult>("check_for_updates");
}

export function downloadUpdate(): Promise<UpdateDownloadResult> {
  return invoke<UpdateDownloadResult>("download_update");
}

export function launchUpdateInstaller(confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("launch_update_installer", { confirmationToken });
}

export function selfUninstall(confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("self_uninstall", { confirmationToken });
}
