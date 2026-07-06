import { invoke } from "../../core/invoke";
import type { DoctorReport, OperationResult } from "../../types";

export function runDoctorReport(): Promise<DoctorReport> {
  return invoke<DoctorReport>("run_doctor");
}

export function exportDoctorReport(report: DoctorReport): Promise<OperationResult> {
  return invoke<OperationResult>("export_doctor_report", { report });
}

export function exportDoctorReportJson(report: DoctorReport): Promise<OperationResult> {
  return invoke<OperationResult>("export_doctor_report_json", { report });
}

export function doctorReportText(report: DoctorReport, format: "markdown" | "json"): Promise<string> {
  return invoke<string>("doctor_report_text", { report, format });
}

export function exportEnvReliabilityReport(format: "markdown" | "json"): Promise<string> {
  return invoke<string>("export_env_reliability_report", { format });
}

export function exportPythonDiagnosticReport(): Promise<OperationResult> {
  return invoke<OperationResult>("export_python_diagnostic_report");
}

export function exportFileAssociationReport(): Promise<string> {
  return invoke<string>("export_file_association_report");
}

export function exportCleanupReport(format: "markdown" | "json"): Promise<string> {
  return invoke<string>("export_cleanup_report", { format });
}
