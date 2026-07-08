import { getActiveLocale, t } from "../../core/i18n";
import type { ReportsWorkbenchState } from "./state";

export type ReportsViewModel = {
  doctorScore: string;
  doctorScoreDetail: string;
  checks: string;
  suggestions: string;
  doctorRows: Array<{ label: string; value: string }>;
  checkRows: Array<{ label: string; value: string }>;
  suggestionRows: Array<{ label: string; value: string }>;
  reportText: string;
};

export function toReportsViewModel(state: ReportsWorkbenchState): ReportsViewModel {
  const doctor = state.doctor;
  return {
    doctorScore: doctor ? String(doctor.score) : notRun(),
    doctorScoreDetail: doctor?.summary ?? "",
    checks: doctor ? String(doctor.checks.length) : label("No checks yet", "暂无检查项"),
    suggestions: doctor ? String(doctor.suggestions.length) : label("No suggestions yet", "暂无建议"),
    doctorRows: doctor
      ? [
          { label: label("Generated at", "生成时间"), value: formatTimestamp(doctor.generatedAt) },
          { label: label("Score", "评分"), value: String(doctor.score) },
          { label: label("Summary", "摘要"), value: doctor.summary },
        ]
      : [],
    checkRows: (doctor?.checks ?? []).slice(0, 10).map((check) => ({
      label: `${check.severity} / ${check.status}: ${check.title}`,
      value: check.detail,
    })),
    suggestionRows: (doctor?.suggestions ?? []).slice(0, 10).map((suggestion) => ({
      label: suggestion.title,
      value: suggestion.description,
    })),
    reportText: state.text || label("Run Environment Doctor to generate a report preview.", "运行环境医生后生成报告预览。"),
  };
}

function notRun(): string {
  return t("feature.reports.noDoctor");
}

function formatTimestamp(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return label("Not generated", "尚未生成");
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    return new Date((number < 10_000_000_000 ? number * 1000 : number)).toLocaleString();
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? text : new Date(parsed).toLocaleString();
}

function label(en: string, zh: string): string {
  return getActiveLocale() === "zh-CN" ? zh : en;
}
