import type { FeatureContext } from "../../app/featureContext";
import { getActiveLocale, t } from "../../core/i18n";
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
  context.root.querySelectorAll<HTMLButtonElement>("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.pageAction === "profiles:prev") state.page = Math.max(1, state.page - 1);
      if (button.dataset.pageAction === "profiles:next") state.page += 1;
      context.root.innerHTML = renderProfilesWorkbench(state);
      bindProfileEvents(context, state);
    });
  });
  bindAction(context.root, "save-profile", async () => {
    context.progress.start(t("feature.profiles.saving"));
    try {
      const result = await saveCurrentProfile(context.root.querySelector<HTMLInputElement>("#profile-name")?.value.trim() || "Current profile");
      context.toast(result.message);
      if (!context.isCurrent()) return;
      await refreshProfiles(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "create-profile-plan", async () => {
    const id = state.selectedProfileId || state.profiles[0]?.id;
    if (!id) return context.toast(t("toast.selectProfileFirst"), true);
    context.progress.start(t("feature.profiles.creatingPlan"));
    try {
      state.plan = await createProfileApplyPlan(id);
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderProfilesWorkbench(state);
      bindProfileEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-profile-plan", () => {
    if (!state.plan) return context.toast(t("toast.createProfilePlanFirst"), true);
    return context.risk.run({
      command: "execute_profile_apply_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      backupReceipt: state.plan.backupName,
      title: t("feature.profiles.executePlan"),
      summary: label("Apply the selected configuration profile after reviewing runtime and environment changes.", "应用已审阅的配置模板计划，包含运行时切换和用户环境写入。"),
      before: [
        { label: label("Profile", "配置模板"), value: state.plan.profileName },
        { label: label("Current backup", "执行前备份"), value: state.plan.backupName },
      ],
      after: [
        { label: label("Runtime switches", "运行时切换"), value: state.plan.runtimeSwitches.join(", ") || label("None", "无") },
        { label: label("Missing runtimes", "缺失运行时"), value: String(state.plan.missingRequirements.length) },
        { label: label("Install missing runtimes", "补齐缺失运行时"), value: state.plan.willInstall ? label("Yes", "是") : label("No", "否") },
        { label: label("Write user environment", "写入用户环境"), value: state.plan.willWriteEnvironment ? label("Yes", "是") : label("No", "否") },
      ],
      warnings: [label("Use the backup shown here to restore if the applied profile is not correct.", "如果应用后环境不正确，请使用这里显示的备份恢复。"), ...state.plan.warnings.map(localizeProfileWarning)],
      execute: (confirmationToken) => executeProfileApplyPlan(state.plan!.planId, confirmationToken),
    });
  });
  bindAction(context.root, "preview-profile-import", async () => {
    const path = context.root.querySelector<HTMLInputElement>("#profile-import-path")?.value.trim() ?? "";
    state.importPreview = await previewConfigProfiles(path);
    if (!context.isCurrent()) return;
    context.toast(t("toast.profileImportPreviewReady"));
  });
  bindAction(context.root, "export-profiles", exportConfigProfiles);
  bindAction(context.root, "delete-profile", async () => {
    const id = state.selectedProfileId || state.profiles[0]?.id;
    if (!id) return context.toast(t("toast.selectProfileFirst"), true);
    if (!window.confirm(t("feature.profiles.deleteConfirm"))) return;
    context.progress.start(t("feature.profiles.deleting"));
    try {
      const result = await deleteConfigProfile(id);
      context.toast(result.message);
      state.selectedProfileId = null;
      if (!context.isCurrent()) return;
      await refreshProfiles(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}

function localizeProfileWarning(warning: string): string {
  if (getActiveLocale() !== "zh-CN") return warning;
  if (warning.includes("install runtimes") || warning.includes("environment values")) {
    return "此计划可能安装缺失运行时并写入用户级环境变量。";
  }
  if (warning.includes("single-use")) {
    return "此计划只能执行一次；配置模板变更后需要重新创建计划。";
  }
  return warning;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function refreshProfiles(context: FeatureContext, state: ProfilesState): Promise<void> {
  context.progress.start(t("feature.profiles.loading"));
  try {
    state.profiles = await listProfiles();
    if (!context.isCurrent()) return;
    state.selectedProfileId = state.selectedProfileId ?? state.profiles[0]?.id ?? null;
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.profiles.length / 10)));
    context.progress.done(t("feature.profiles.loaded"));
    context.root.innerHTML = renderProfilesWorkbench(state);
    bindProfileEvents(context, state);
  } catch (error) {
    context.progress.fail(errorMessage(error));
  }
}
