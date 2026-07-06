import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { applyAssociationPlan, createAssociationPlan, exportAssociationReport, listAssociationBackups, openDefaultAppsSettings, rollbackAssociationBackup, scanAssociations, searchAssociationApp } from "./api";
import { renderFileAssociations } from "./render";
import type { FileAssociationUiState } from "./state";

export function bindFileAssociationEvents(context: FeatureContext, state: FileAssociationUiState): void {
  bindAction(context.root, "scan-associations", () => refreshFileAssociations(context, state));
  bindAction(context.root, "search-association-app", async () => {
    syncInputs(context, state);
    state.appSearch = await searchAssociationApp(state.targetAppName, [...state.selectedExtensions][0] ?? "");
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
  });
  bindAction(context.root, "create-association-plan", async () => {
    syncInputs(context, state);
    state.plan = await createAssociationPlan({
      extensions: [...state.selectedExtensions],
      targetAppName: state.targetAppName,
      targetExecutable: state.targetExecutable,
      advancedHighRisk: false,
    });
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
  });
  bindAction(context.root, "apply-association-plan", async () => {
    if (!state.plan) return context.toast("Create an association plan first.", true);
    await context.risk.run({
      command: "apply_file_association_plan",
      planId: state.plan.planId,
      riskLevel: "high",
      backupReceipt: valueOf(state.plan, "backupName", null),
      title: "Apply file association plan",
      summary: "Applies ordinary and high-risk file association changes through a backend token gate.",
      warnings: ["UserChoice-protected associations may open Windows Settings instead of writing registry values."],
      execute: (confirmationToken) => applyAssociationPlan(state.plan!, confirmationToken),
    });
  });
  bindAction(context.root, "rollback-association-backup", async () => {
    const backup = state.backups[0];
    if (!backup) return context.toast("No backup available.", true);
    await context.risk.run({
      command: "rollback_file_association_backup",
      planId: valueOf(backup, "id", "file-association-backup"),
      riskLevel: "high",
      backupReceipt: valueOf(backup, "fileName", null),
      title: "Rollback file association backup",
      summary: "Restores a previous file association backup through a token-gated backend command.",
      warnings: ["Review the backup timestamp before rollback."],
      execute: (confirmationToken) => rollbackAssociationBackup(valueOf(backup, "id", ""), confirmationToken),
    });
  });
  bindAction(context.root, "open-default-apps", openDefaultAppsSettings);
  bindAction(context.root, "export-association-report", async () => context.toast(await exportAssociationReport()));
}

export async function refreshFileAssociations(context: FeatureContext, state: FileAssociationUiState): Promise<void> {
  const [report, backups] = await Promise.all([scanAssociations(), listAssociationBackups()]);
  state.report = report;
  state.backups = backups;
  context.root.innerHTML = renderFileAssociations(state);
  bindFileAssociationEvents(context, state);
}

function syncInputs(context: FeatureContext, state: FileAssociationUiState): void {
  const extension = context.root.querySelector<HTMLInputElement>("#assoc-extension")?.value.trim();
  state.selectedExtensions = new Set(extension ? [extension] : []);
  state.targetAppName = context.root.querySelector<HTMLInputElement>("#assoc-app")?.value.trim() ?? "";
  state.targetExecutable = context.root.querySelector<HTMLInputElement>("#assoc-exe")?.value.trim() ?? "";
}
