import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import {
  doctorReportText,
  exportCleanupReport,
  exportDoctorReport,
  exportDoctorReportJson,
  exportEnvReliabilityReport,
  exportFileAssociationReport,
  exportPortReport,
  exportProjectReport,
  exportPythonDiagnosticReport,
  runDoctorReport,
} from "./api";
import { renderReportsWorkbench } from "./render";
import type { ReportsWorkbenchState } from "./state";

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
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
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
  context.toast(message);
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
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
