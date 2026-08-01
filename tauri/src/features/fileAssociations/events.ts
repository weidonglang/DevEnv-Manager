import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { localize, t } from "../../core/i18n";
import { bindAction, revealResult } from "../sharedView";
import { applyAssociationPlan, createAssociationPlan, exportAssociationReport, listAssociationBackups, openDefaultAppsSettings, rollbackAssociationBackup, scanAssociations, searchAssociationApp } from "./api";
import { renderFileAssociations } from "./render";
import type { FileAssociationUiState } from "./state";

export function bindFileAssociationEvents(context: FeatureContext, state: FileAssociationUiState): void {
  bindAction(context.root, "scan-associations", () => refreshFileAssociations(context, state, true));
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
    revealResult(context.root, "[data-testid='file-associations-workflow']");
  });
  bindAction(context.root, "search-association-app", async () => {
    syncInputs(context, state);
    state.operationError = "";
    state.appSearchError = "";
    state.appSearch = null;
    if (!state.targetAppName) {
      const extension = [...state.selectedExtensions][0] ?? normalizeExtension(state.filter.keyword);
      const match = state.report?.records.find((record) => record.extension.toLowerCase() === extension.toLowerCase());
      state.selectionResult = match
        ? localize(`${extension} currently opens with ${match.currentAppName || "an unknown application"}. Enter an application name or choose an executable to change it.`, `${extension} 当前由 ${match.currentAppName || "未知应用"} 打开；请输入目标应用名或选择可执行文件后再创建计划。`)
        : localize(`No scanned association matched ${extension || "the query"}. Scan associations first.`, `扫描结果中没有找到 ${extension || "该查询"}；请先扫描关联。`);
      state.appSearchStatus = "idle";
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='file-associations-selection-result']");
      return;
    }
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
      revealResult(context.root, "[data-testid='file-associations-app-search-result']");
    } catch (error) {
      state.appSearchStatus = "failed";
      state.appSearchError = errorMessage(error);
      context.progress.fail(state.appSearchError);
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      revealResult(context.root, "[data-testid='file-associations-app-search-result']");
    }
  });
  bindAction(context.root, "create-association-plan", async () => {
    syncInputs(context, state);
    state.operationError = "";
    state.plan = null;
    if (!state.selectedExtensions.size || !state.targetExecutable) {
      state.operationError = !state.selectedExtensions.size
        ? localize("Select an extension before creating a plan.", "创建计划前请先选择扩展名。")
        : localize("Choose an executable or select an application search result before creating a plan.", "创建计划前请选择可执行文件，或选择一个应用搜索结果。")
      renderAndBind(context, state);
      revealResult(context.root, "[data-testid='file-associations-plan-preview']");
      return;
    }
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
      revealResult(context.root, "[data-testid='file-associations-plan-preview']");
    } catch (error) {
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      revealResult(context.root, "[data-testid='file-associations-plan-preview']");
    }
  });
  bindAction(context.root, "apply-association-plan", async () => {
    if (!state.plan) {
      state.operationError = t("toast.createAssociationPlanFirst");
      context.toast(state.operationError, true);
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      revealResult(context.root, "[data-testid='file-associations-plan-preview']");
      return;
    }
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
        title: localize("Apply file association plan", "应用文件关联计划"),
        summary: localize("Applies ordinary and high-risk file association changes through a backend token gate.", "通过后端确认令牌应用普通或高风险文件关联变更。"),
        warnings: [localize("UserChoice-protected associations may open Windows Settings instead of writing registry values.", "受 UserChoice 保护的关联可能会打开 Windows 设置，而不是直接写入注册表。")],
        execute: (confirmationToken) => applyAssociationPlan(state.plan!, confirmationToken),
      });
      state.applyResult = result as FileAssociationUiState["applyResult"];
      state.applyResultMessage = state.applyResult?.message ?? "";
      await reloadAssociationBackups(context, state);
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
    revealResult(context.root, "[data-testid='file-associations-operation-result']");
  });
  bindAction(context.root, "rollback-association-backup", async () => {
    const appliedBackupId = state.applyResult?.backupId;
    const backup = state.backups.find((item) => item.backupId === appliedBackupId) ?? state.backups[0];
    if (!backup) {
      state.operationError = t("toast.noBackupAvailable");
      context.toast(state.operationError, true);
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      revealResult(context.root, "[data-testid='file-associations-operation-result']");
      return;
    }
    state.rollbackResult = null;
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "rollback_file_association_backup",
        planId: backup.backupId,
        riskLevel: "high",
        backupReceipt: backup.backupPath,
        title: localize("Rollback file association backup", "回滚文件关联备份"),
        summary: localize("Restores a previous file association backup through a token-gated backend command.", "通过确认令牌保护的后端命令恢复之前的文件关联备份。"),
        warnings: [localize("Review the backup timestamp before rollback.", "回滚前请检查备份时间。")],
        execute: (confirmationToken) => rollbackAssociationBackup(backup.backupId, confirmationToken),
      });
      state.rollbackResult = result as FileAssociationUiState["rollbackResult"];
      state.applyResultMessage = state.rollbackResult?.message ?? "";
      await reloadAssociationBackups(context, state);
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderFileAssociations(state);
    bindFileAssociationEvents(context, state);
    revealResult(context.root, "[data-testid='file-associations-operation-result']");
  });
  bindAction(context.root, "open-default-apps", async () => {
    await openDefaultAppsSettings();
    state.operationMessage = localize("Windows Default Apps settings opened.", "已打开 Windows 默认应用设置。");
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='file-associations-operation-result']");
  });
  bindAction(context.root, "export-association-report", async () => {
    state.operationMessage = await exportAssociationReport();
    renderAndBind(context, state);
    revealResult(context.root, "[data-testid='file-associations-operation-result']");
  });
  bindAssociationFilter(context, state);
  context.root.querySelectorAll<HTMLButtonElement>("[data-assoc-extension]").forEach((button) => {
    button.addEventListener("click", () => {
      const extension = button.dataset.assocExtension || "";
      state.selectedExtensions = new Set(extension ? [normalizeExtension(extension)] : []);
      state.targetAppName = "";
      state.targetExecutable = "";
      state.plan = null;
      state.selectionResult = localize(
        `${extension} selected. Choose an executable or enter and search for the target application, then create a plan.`,
        `已选择 ${extension}；请选择可执行文件，或输入并搜索目标应用，然后创建计划。`,
      );
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
      revealResult(context.root, "[data-testid='file-associations-workflow']");
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
      revealResult(context.root, "[data-testid='file-associations-workflow']");
    });
  });
}

export async function refreshFileAssociations(context: FeatureContext, state: FileAssociationUiState, reveal = false): Promise<void> {
  state.scanStatus = "loading";
  state.operationError = "";
  renderAndBind(context, state);
  const [report, backups] = await Promise.allSettled([scanAssociations(), listAssociationBackups()]);
  if (!context.isCurrent()) return;
  if (report.status === "fulfilled") {
    state.report = report.value;
    state.scanStatus = report.value.records.length ? "results" : "empty";
    state.operationMessage = localize(`Association scan completed: ${report.value.records.length} records.`, `关联扫描完成：${report.value.records.length} 条记录。`);
  } else {
    state.scanStatus = "failed";
    state.operationError = errorMessage(report.reason);
  }
  if (backups.status === "fulfilled") state.backups = backups.value;
  else state.operationError = [state.operationError, errorMessage(backups.reason)].filter(Boolean).join("; ");
  renderAndBind(context, state);
  if (reveal) revealResult(context.root, "[data-testid='file-associations-records-section']");
}

async function reloadAssociationBackups(context: FeatureContext, state: FileAssociationUiState): Promise<void> {
  try {
    const backups = await listAssociationBackups();
    if (!context.isCurrent()) return;
    state.backups = backups;
  } catch (error) {
    if (!context.isCurrent()) return;
    state.operationError = `${t("feature.fileAssociations.backupRefreshFailed")}: ${errorMessage(error)}`;
  }
}

function syncInputs(context: FeatureContext, state: FileAssociationUiState): void {
  state.filter.keyword = context.root.querySelector<HTMLInputElement>("#assoc-filter")?.value.trim() ?? "";
  const extension = normalizeExtension(context.root.querySelector<HTMLInputElement>("#assoc-extension")?.value.trim() || "");
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
      const extension = normalizeExtension(state.filter.keyword);
      if (/^\.[a-z0-9+_-]+$/i.test(extension)) state.selectedExtensions = new Set([extension]);
      context.root.innerHTML = renderFileAssociations(state);
      bindFileAssociationEvents(context, state);
    }, 140);
  });
}

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function renderAndBind(context: FeatureContext, state: FileAssociationUiState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderFileAssociations(state);
  bindFileAssociationEvents(context, state);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
