import type { FeatureContext } from "../../app/featureContext";
import { bindAction, valueOf } from "../sharedView";
import { doctorReportText, exportCleanupReport, exportDoctorReport, exportDoctorReportJson, exportEnvReliabilityReport, exportFileAssociationReport, runDoctorReport } from "./api";
import { renderReportsWorkbench } from "./render";
import type { ReportsWorkbenchState } from "./state";

export function bindReportEvents(context: FeatureContext, state: ReportsWorkbenchState): void {
  bindAction(context.root, "run-doctor-report", () => refreshReports(context, state));
  bindAction(context.root, "export-doctor-markdown", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    await exportDoctorReport(state.doctor);
  });
  bindAction(context.root, "export-doctor-json", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    await exportDoctorReportJson(state.doctor);
  });
  bindAction(context.root, "copy-report-summary", async () => {
    if (!state.doctor) state.doctor = await runDoctorReport();
    state.text = await doctorReportText(state.doctor, "markdown");
    await navigator.clipboard.writeText(state.text || valueOf(state.doctor, "summary"));
    context.root.innerHTML = renderReportsWorkbench(state);
    bindReportEvents(context, state);
  });
  bindAction(context.root, "export-environment-report", async () => context.toast(await exportEnvReliabilityReport("markdown")));
  bindAction(context.root, "export-file-association-report", async () => context.toast(await exportFileAssociationReport()));
  bindAction(context.root, "export-cleanup-report", async () => context.toast(await exportCleanupReport("json")));
}

export async function refreshReports(context: FeatureContext, state: ReportsWorkbenchState): Promise<void> {
  state.doctor = await runDoctorReport();
  state.text = await doctorReportText(state.doctor, "markdown");
  context.root.innerHTML = renderReportsWorkbench(state);
  bindReportEvents(context, state);
}
