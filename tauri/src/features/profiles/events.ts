import type { FeatureContext } from "../../app/featureContext";
import { bindAction } from "../sharedView";
import { createProfileApplyPlan, deleteConfigProfile, executeProfileApplyPlan, exportConfigProfiles, listProfiles, previewConfigProfiles, saveCurrentProfile } from "./api";
import { renderProfilesWorkbench } from "./render";
import type { ProfilesState } from "./state";

export function bindProfileEvents(context: FeatureContext, state: ProfilesState): void {
  bindAction(context.root, "refresh-profiles", () => refreshProfiles(context, state));
  context.root.querySelectorAll<HTMLButtonElement>("[data-profile-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProfileId = button.dataset.profileId || null;
      context.root.innerHTML = renderProfilesWorkbench(state);
      bindProfileEvents(context, state);
    });
  });
  bindAction(context.root, "save-profile", async () => {
    await saveCurrentProfile(context.root.querySelector<HTMLInputElement>("#profile-name")?.value.trim() || "Current profile");
    await refreshProfiles(context, state);
  });
  bindAction(context.root, "create-profile-plan", async () => {
    const id = state.selectedProfileId || state.profiles[0]?.id;
    if (!id) return context.toast("Select a profile first.", true);
    state.plan = await createProfileApplyPlan(id);
    context.root.innerHTML = renderProfilesWorkbench(state);
    bindProfileEvents(context, state);
  });
  bindAction(context.root, "execute-profile-plan", () => {
    if (!state.plan) return context.toast("Create a profile apply plan first.", true);
    return context.risk.run({
      command: "execute_profile_apply_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      backupReceipt: state.plan.backupName,
      title: "Execute profile apply plan",
      summary: "Applies runtime switches and environment writes from a reviewed profile plan.",
      warnings: state.plan.warnings,
      execute: (confirmationToken) => executeProfileApplyPlan(state.plan!.planId, confirmationToken),
    });
  });
  bindAction(context.root, "preview-profile-import", async () => {
    const path = context.root.querySelector<HTMLInputElement>("#profile-import-path")?.value.trim() ?? "";
    state.importPreview = await previewConfigProfiles(path);
    context.toast("Profile import preview ready.");
  });
  bindAction(context.root, "export-profiles", exportConfigProfiles);
  bindAction(context.root, "delete-profile", async () => {
    const id = state.selectedProfileId || state.profiles[0]?.id;
    if (id) await deleteConfigProfile(id);
    await refreshProfiles(context, state);
  });
}

export async function refreshProfiles(context: FeatureContext, state: ProfilesState): Promise<void> {
  state.profiles = await listProfiles();
  state.selectedProfileId = state.selectedProfileId ?? state.profiles[0]?.id ?? null;
  context.root.innerHTML = renderProfilesWorkbench(state);
  bindProfileEvents(context, state);
}
