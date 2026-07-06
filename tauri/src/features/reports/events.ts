import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { doctorReportText, exportCleanupReport, exportDoctorReport, exportDoctorReportJson, exportEnvReliabilityReport, exportFileAssociationReport, exportPythonDiagnosticReport, runDoctorReport } from "./api";
import { renderReportsWorkbench } from "./render";
import type { ReportsWorkbenchState } from "./state";

export function bindReportEvents(context: FeatureContext, state: ReportsWorkbenchState): void {
  bindAction(context.root, "run-doctor-report", () => refreshReports(context, state));
  bindAction(context.root, "export-doctor-markdown", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    state.lastExport = (await exportDoctorReport(state.doctor)).message;
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "export-doctor-json", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    state.lastExport = (await exportDoctorReportJson(state.doctor)).message;
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "copy-report-summary", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    state.text = await doctorReportText(state.doctor, "markdown");
    await navigator.clipboard.writeText(state.text || valueOf(state.doctor, "summary"));
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "export-environment-report", async () => showExport(context, state, await exportEnvReliabilityReport("markdown")));
  bindAction(context.root, "export-python-report", async () => showExport(context, state, (await exportPythonDiagnosticReport()).message));
  bindAction(context.root, "export-file-association-report", async () => showExport(context, state, await exportFileAssociationReport()));
  bindAction(context.root, "export-cleanup-report", async () => showExport(context, state, await exportCleanupReport("json")));
}

export async function refreshReports(context: FeatureContext, state: ReportsWorkbenchState): Promise<void> {
  state.doctor = await runDoctorReport();
  state.text = await doctorReportText(state.doctor, "markdown");
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
}

function showExport(context: FeatureContext, state: ReportsWorkbenchState, message: string): void {
  state.lastExport = message;
  context.toast(message);
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
}
