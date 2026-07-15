import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { applyAssociationPlan, createAssociationPlan, exportAssociationReport, listAssociationBackups, openDefaultAppsSettings, rollbackAssociationBackup, scanAssociations, searchAssociationApp } from "./api";
import { renderFileAssociations } from "./render";
import type { FileAssociationUiState } from "./state";

export function bindFileAssociationEvents(context: FeatureContext, state: FileAssociationUiState): void {
  bindAction(context.root, "scan-associations", () => refreshFileAssociations(context, state));
  bindAction(context.root, "choose-association-exe", async () => {
    const selected = await open({ directory: false, multiple: false, filters: [{ name: "Executable", extensions: ["exe"] }] });
    if (!selected || Array.isArray(selected)) {
      state.selectionResult = t("feature.fileAssociations.chooseExeCancelled");
      context.toast(t("feature.fileAssociations.chooseExeCancelled"));
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      return;
    }
    syncInputs(context, state);
    state.targetExecutable = selected;
    state.selectionResult = `${t("feature.fileAssociations.exePath")}: ${selected}`;
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
  });
  bindAction(context.root, "search-association-app", async () => {
    syncInputs(context, state);
    state.operationError = "";
    state.appSearchError = "";
    state.appSearch = null;
    state.appSearchStatus = "loading";
    context.progress.start(t("feature.fileAssociations.search"));
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
    try {
      state.appSearch = await searchAssociationApp(state.targetAppName, [...state.selectedExtensions][0] ?? "");
      state.appSearchStatus = state.appSearch.candidates.length ? "results" : "empty";
      if (!context.isCurrent()) return;
      context.progress.done(t("state.available"));
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    } catch (error) {
      state.appSearchStatus = "failed";
      state.appSearchError = errorMessage(error);
      context.progress.fail(state.appSearchError);
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    }
  });
  bindAction(context.root, "create-association-plan", async () => {
    syncInputs(context, state);
    state.operationError = "";
    state.plan = null;
    context.progress.start(t("feature.fileAssociations.createPlan"));
    try {
      state.plan = await createAssociationPlan({
        extensions: [...state.selectedExtensions],
        targetAppName: state.targetAppName,
        targetExecutable: state.targetExecutable,
        advancedHighRisk: false,
      });
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    } catch (error) {
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    }
  });
  bindAction(context.root, "apply-association-plan", async () => {
    if (!state.plan) return context.toast(t("toast.createAssociationPlanFirst"), true);
    state.applyResult = null;
    state.rollbackResult = null;
    state.operationError = "";
    state.applyResultMessage = "";
    try {
      const result = await context.risk.run({
        command: "apply_file_association_plan",
        planId: state.plan.planId,
        riskLevel: "high",
        backupReceipt: state.plan.backupPath,
        title: "Apply file association plan",
        summary: "Applies ordinary and high-risk file association changes through a backend token gate.",
        warnings: ["UserChoice-protected associations may open Windows Settings instead of writing registry values."],
        execute: (confirmationToken) => applyAssociationPlan(state.plan!, confirmationToken),
      });
      state.applyResult = result as FileAssociationUiState["applyResult"];
      state.applyResultMessage = state.applyResult?.message ?? "";
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
  });
  bindAction(context.root, "rollback-association-backup", async () => {
    const backup = state.backups[0];
    if (!backup) return context.toast(t("toast.noBackupAvailable"), true);
    state.rollbackResult = null;
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "rollback_file_association_backup",
        planId: backup.backupId,
        riskLevel: "high",
        backupReceipt: backup.backupPath,
        title: "Rollback file association backup",
        summary: "Restores a previous file association backup through a token-gated backend command.",
        warnings: ["Review the backup timestamp before rollback."],
        execute: (confirmationToken) => rollbackAssociationBackup(backup.backupId, confirmationToken),
      });
      state.rollbackResult = result as FileAssociationUiState["rollbackResult"];
      state.applyResultMessage = state.rollbackResult?.message ?? "";
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
  });
  bindAction(context.root, "open-default-apps", openDefaultAppsSettings);
  bindAction(context.root, "export-association-report", async () => context.toast(await exportAssociationReport()));
  bindAssociationFilter(context, state);
  context.root.querySelectorAll<HTMLButtonElement>("[data-assoc-extension]").forEach((button) => {
    button.addEventListener("click", () => {
      const extension = button.dataset.assocExtension || "";
      state.selectedExtensions = new Set(extension ? [extension] : []);
      state.targetAppName = button.dataset.assocApp || state.targetAppName;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    });
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-assoc-candidate-app]").forEach((button) => {
    button.addEventListener("click", () => {
      syncInputs(context, state);
      state.targetAppName = button.dataset.assocCandidateApp || state.targetAppName;
      state.targetExecutable = button.dataset.assocCandidateExe || state.targetExecutable;
      state.plan = null;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    });
  });
}

export async function refreshFileAssociations(context: FeatureContext, state: FileAssociationUiState): Promise<void> {
  const [report, backups] = await Promise.all([scanAssociations(), listAssociationBackups()]);
  if (!context.isCurrent()) return;
  state.report = report;
  state.backups = backups;
  context.root.innerHTML = renderFileAssociations(state);
  bindFileAssociationEvents(context, state);
}

function syncInputs(context: FeatureContext, state: FileAssociationUiState): void {
  state.filter.keyword = context.root.querySelector<HTMLInputElement>("#assoc-filter")?.value.trim() ?? "";
  const extension = context.root.querySelector<HTMLInputElement>("#assoc-extension")?.value.trim();
  state.selectedExtensions = new Set(extension ? [extension] : []);
  state.targetAppName = context.root.querySelector<HTMLInputElement>("#assoc-app")?.value.trim() ?? "";
  state.targetExecutable = context.root.querySelector<HTMLInputElement>("#assoc-exe")?.value.trim() ?? "";
}

function bindAssociationFilter(context: FeatureContext, state: FileAssociationUiState): void {
  const input = context.root.querySelector<HTMLInputElement>("#assoc-filter");
  let timer: number | undefined;
  input?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.filter.keyword = input.value.trim();
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    }, 140);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
