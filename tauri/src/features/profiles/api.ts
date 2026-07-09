import { invoke } from "../../core/invoke";
import type { ConfigProfile, ConfigProfileImportPreview, OperationResult, ProfileApplyPlan } from "../../types";

export function listProfiles(): Promise<ConfigProfile[]> {
  return invoke<ConfigProfile[]>("list_config_profiles");
}

export function saveCurrentProfile(name: string): Promise<OperationResult> {
  return invoke<OperationResult>("save_config_profile", { name });
}

export function createProfileApplyPlan(id: string): Promise<ProfileApplyPlan> {
  return invoke<ProfileApplyPlan>("create_profile_apply_plan", { id });
}

export function executeProfileApplyPlan(planId: string, confirmationToken: string): Promise<OperationResult> {
  return invoke<OperationResult>("execute_profile_apply_plan", { planId, confirmationToken });
}

export function previewConfigProfiles(path: string): Promise<ConfigProfileImportPreview> {
  return invoke<ConfigProfileImportPreview>("preview_config_profiles", { path });
}

export function importConfigProfiles(path: string): Promise<OperationResult> {
  return invoke<OperationResult>("import_config_profiles", { path });
}

export function exportConfigProfiles(): Promise<OperationResult> {
  return invoke<OperationResult>("export_config_profiles");
}

export function deleteConfigProfile(id: string): Promise<OperationResult> {
  return invoke<OperationResult>("delete_config_profile", { id });
}

export function renameConfigProfile(id: string, name: string): Promise<OperationResult> {
  return invoke<OperationResult>("rename_config_profile", { id, name });
}

export function copyConfigProfile(id: string, name: string): Promise<OperationResult> {
  return invoke<OperationResult>("copy_config_profile", { id, name });
}
