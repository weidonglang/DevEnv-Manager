import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import {
  createDoctorRepairPlan,
  doctorReportText,
  executeDoctorRepairPlan,
  exportCleanupReport,
  exportDoctorReport,
  exportDoctorReportJson,
  exportEnvReliabilityReport,
  exportFileAssociationReport,
  exportPortReport,
  exportProjectReport,
  exportPythonDiagnosticReport,
  openReportLocation,
  runDoctorReport,
} from "./api";
import { renderReportsWorkbench } from "./render";
import { persistReportsState, type ReportsWorkbenchState } from "./state";

export function bindReportEvents(context: FeatureContext, state: ReportsWorkbenchState): void {
  bindAction(context.root, "run-doctor-report", () => refreshReports(context, state));
  bindAction(context.root, "export-doctor-markdown", async () => {
    if (!ensureDoctor(context, state)) return;
    await exportWithProgress(context, state, () => exportDoctorReport(state.doctor).then((result) => result.message));
  });
  bindAction(context.root, "export-doctor-json", async () => {
    if (!ensureDoctor(context, state)) return;
    await exportWithProgress(context, state, () => exportDoctorReportJson(state.doctor).then((result) => result.message));
  });
  bindAction(context.root, "copy-report-summary", async () => {
    if (!ensureDoctor(context, state)) return;
    state.text = await doctorReportText(state.doctor, "markdown");
    await navigator.clipboard.writeText(state.text || state.doctor.summary);
    context.toast(t("feature.reports.summaryCopied"));
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "create-doctor-repair-plan", async () => {
    context.progress.start(t("feature.reports.creatingDoctorPlan"));
    try {
      state.doctorPlan = await createDoctorRepairPlan();
      state.doctorRepairResult = null;
      if (!context.isCurrent()) return;
      context.progress.done(t("toast.planReady"));
      persistReportsState(state);
      context.root.innerHTML = renderReportsWorkbench(state);
      bindReportEvents(context, state);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "execute-doctor-repair-plan", async () => {
    if (!state.doctorPlan) {
      context.toast(t("feature.reports.createDoctorPlanFirst"), true);
      return;
    }
    const plan = state.doctorPlan;
    const result = await context.risk.run({
      command: "execute_doctor_repair_plan",
      planId: plan.planId,
      riskLevel: "high",
      backupReceipt: plan.backupName,
      title: t("feature.reports.executeDoctorPlan"),
      summary: t("feature.reports.executeDoctorPlanSummary"),
      before: [
        { label: t("feature.reports.doctorScore"), value: String(plan.beforeScore) },
        { label: t("feature.reports.actions"), value: plan.actions.join(", ") || t("state.notAvailable") },
      ],
      warnings: plan.warnings,
      execute: (confirmationToken) => executeDoctorRepairPlan(plan.planId, confirmationToken),
    });
    state.doctorRepairResult = result as ReportsWorkbenchState["doctorRepairResult"];
    state.doctor = state.doctorRepairResult?.report ?? state.doctor;
    state.doctorPlan = null;
    if (state.doctor) state.text = await doctorReportText(state.doctor, "markdown");
    persistReportsState(state);
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "open-latest-report-location", async () => {
    const path = state.lastExportPath || extractExportPath(state.lastExport);
    if (!path) {
      context.toast(t("feature.reports.latestExportLocationMissing"), true);
      return;
    }
    context.progress.start(t("feature.reports.openingLatestExport"));
    try {
      const result = await openReportLocation(path);
      context.progress.done(result.message);
    } catch (error) {
      context.progress.fail(errorMessage(error));
    }
  });
  bindAction(context.root, "export-environment-report", () => exportWithProgress(context, state, () => exportEnvReliabilityReport("markdown")));
  bindAction(context.root, "export-python-report", () => exportWithProgress(context, state, () => exportPythonDiagnosticReport().then((result) => result.message)));
  bindAction(context.root, "export-file-association-report", () => exportWithProgress(context, state, exportFileAssociationReport));
  bindAction(context.root, "export-cleanup-report", () => exportWithProgress(context, state, () => exportCleanupReport("json")));
  bindAction(context.root, "export-port-report", () => exportWithProgress(context, state, () => exportPortReport("json")));
  bindAction(context.root, "export-project-report", () => exportWithProgress(context, state, () => exportProjectReport("json")));
}

export async function refreshReports(context: FeatureContext, state: ReportsWorkbenchState): Promise<void> {
  context.progress.start(t("feature.reports.runningDoctor"));
  try {
    state.doctor = await runDoctorReport();
    state.text = await doctorReportText(state.doctor, "markdown");
    persistReportsState(state);
    if (!context.isCurrent()) return;
    context.progress.done(t("feature.reports.doctorDone"));
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  } catch (error) {
    context.progress.fail(errorMessage(error));
  }
}

async function exportWithProgress(context: FeatureContext, state: ReportsWorkbenchState, exporter: () => Promise<string>): Promise<void> {
  context.progress.start(t("feature.reports.exporting"));
  try {
    showExport(context, state, await exporter());
    context.progress.done(state.lastExport || t("feature.reports.exportDone"));
  } catch (error) {
    context.progress.fail(errorMessage(error));
  }
}

function showExport(context: FeatureContext, state: ReportsWorkbenchState, message: string): void {
  state.lastExport = message;
  state.lastExportPath = extractExportPath(message);
  persistReportsState(state);
  context.toast(message);
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
}

function extractExportPath(message: string): string {
  const trimmed = message.trim();
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) return trimmed;
  const match = message.match(/[A-Za-z]:[\\/][^:*?"<>|\r\n]+/);
  return match?.[0]?.trim() ?? "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ensureDoctor(context: FeatureContext, state: ReportsWorkbenchState): state is ReportsWorkbenchState & { doctor: NonNullable<ReportsWorkbenchState["doctor"]> } {
  if (state.doctor) return true;
  context.toast(t("toast.runDoctorFirst"), true);
  if (!context.isCurrent()) return false;
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
  return false;
}
