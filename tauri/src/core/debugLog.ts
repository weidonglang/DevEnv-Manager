import { getActiveLocale } from "./i18n";

export type DebugEventType = "navigation" | "click" | "input" | "change" | "search" | "filter" | "sort" | "pagination" | "invoke" | "risk" | "token" | "toast" | "progress" | "error" | "export";
export type DebugEventStatus = "started" | "success" | "failed" | "timeout" | "cancelled" | "staleIgnored" | "info";

export type DebugLogEntry = {
  id: string;
  eventId: string;
  timestamp: string;
  type: DebugEventType;
  eventType: DebugEventType;
  name: string;
  eventName: string;
  view?: string;
  feature?: string;
  navigationId?: number;
  status: DebugEventStatus;
  startedAt: string;
  endedAt?: string;
  finishedAt?: string;
  elapsedMs?: number;
  durationMs?: number;
  message?: string;
  detail?: string;
  operationId?: string;
  parentOperationId?: string;
  relatedCommand?: string;
  command?: string;
  planId?: string;
  riskLevel?: string;
  data?: unknown;
  sanitizedArgs?: unknown;
  sanitizedResult?: unknown;
  sanitizedError?: unknown;
};

const STORAGE_KEY = "devenv.debug.entries";
const ADVANCED_KEY = "devenv.advancedMode";
const MAX_ENTRIES = 300;
let currentView: string | undefined;
let currentNavigationId: number | undefined;

export function isAdvancedMode(): boolean {
  return localStorage.getItem(ADVANCED_KEY) === "true";
}

export function setAdvancedMode(enabled: boolean): void {
  localStorage.setItem(ADVANCED_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("devenv:advanced-mode-change", { detail: enabled }));
}

export function setDebugContext(view: string | undefined, navigationId: number | undefined): void {
  currentView = view;
  currentNavigationId = navigationId;
}

export function logDebug(entry: Omit<DebugLogEntry, "id" | "eventId" | "timestamp" | "eventType" | "eventName" | "startedAt"> & { startedAt?: string }): DebugLogEntry {
  const eventId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = entry.startedAt ?? new Date().toISOString();
  const detail = sanitizeText(entry.detail ?? entry.message);
  const sanitizedArgs = sanitize(entry.sanitizedArgs ?? entry.data);
  const item: DebugLogEntry = {
    id: eventId,
    eventId,
    timestamp: startedAt,
    eventType: entry.type,
    eventName: entry.name,
    startedAt,
    view: entry.view ?? currentView,
    feature: entry.feature ?? entry.view ?? currentView,
    navigationId: entry.navigationId ?? currentNavigationId,
    ...entry,
    data: sanitizedArgs,
    sanitizedArgs,
    detail,
    message: detail,
    sanitizedResult: sanitize(entry.sanitizedResult),
    sanitizedError: sanitize(entry.sanitizedError),
  };
  const entries = getDebugEntries();
  entries.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent("devenv:debug-log-change"));
  return item;
}

export function finishDebug(entry: DebugLogEntry, status: DebugEventStatus, detail?: string, data?: unknown): void {
  const endedAt = new Date().toISOString();
  const elapsedMs = Date.parse(endedAt) - Date.parse(entry.startedAt);
  const entries = getDebugEntries();
  const index = entries.findIndex((item) => item.id === entry.id);
  const next = {
    ...entry,
    status,
    endedAt,
    finishedAt: endedAt,
    elapsedMs,
    durationMs: elapsedMs,
    detail: sanitizeText(detail ?? entry.detail),
    message: sanitizeText(detail ?? entry.message ?? entry.detail),
    data: sanitize(data ?? entry.data),
    sanitizedResult: status === "success" ? sanitize(data ?? entry.sanitizedResult ?? entry.data) : entry.sanitizedResult,
    sanitizedError: status === "failed" || status === "timeout" ? sanitize(detail ?? data ?? entry.sanitizedError) : entry.sanitizedError,
  };
  if (index >= 0) entries[index] = next;
  else entries.unshift(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent("devenv:debug-log-change"));
}

export function getDebugEntries(): DebugLogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw as DebugLogEntry[] : [];
  } catch {
    return [];
  }
}

export function clearDebugEntries(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("devenv:debug-log-change"));
}

export function debugEntriesAsMarkdown(entries = getDebugEntries()): string {
  const lines = ["# DevEnv Manager Debug Log", "", `Locale: ${getActiveLocale()}`, ""];
  for (const entry of entries) {
    lines.push(`## ${entry.startedAt} ${entry.type}/${entry.status}`);
    lines.push(`- Name: ${entry.name}`);
    if (entry.view) lines.push(`- View: ${entry.view}`);
    if (entry.navigationId !== undefined) lines.push(`- Navigation: ${entry.navigationId}`);
    if (entry.operationId) lines.push(`- Operation: ${entry.operationId}`);
    if (entry.parentOperationId) lines.push(`- Parent: ${entry.parentOperationId}`);
    if (entry.relatedCommand || entry.command) lines.push(`- Command: ${entry.relatedCommand ?? entry.command}`);
    if (entry.planId) lines.push(`- Plan: ${entry.planId}`);
    if (entry.riskLevel) lines.push(`- Risk: ${entry.riskLevel}`);
    if (entry.elapsedMs !== undefined) lines.push(`- Elapsed: ${entry.elapsedMs} ms`);
    if (entry.detail) lines.push(`- Detail: ${entry.detail}`);
    if (entry.data !== undefined) lines.push(`- Data: \`${JSON.stringify(entry.data)}\``);
    if (entry.sanitizedError !== undefined) lines.push(`- Error: \`${JSON.stringify(entry.sanitizedError)}\``);
    lines.push("");
  }
  return lines.join("\n");
}

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitize);
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (["token", "password", "secret", "cookie", "authorization", "confirmationtoken"].some((marker) => lower.includes(marker))) {
      result[key] = "<redacted>";
    } else {
      result[key] = sanitize(child);
    }
  }
  return result;
}

function sanitizeText(value: unknown): string {
  const home = [safeEnv("USERPROFILE"), safeEnv("HOME")]
    .filter((item): item is string => Boolean(item))
    .sort((a, b) => b.length - a.length);
  let text = String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted>")
    .replace(/(token|password|secret|authorization|cookie)=([^&\s]+)/gi, "$1=<redacted>")
    .replace(/(mysql|postgres|postgresql|mongodb):\/\/[^@\s]+@/gi, "$1://<redacted>@")
    .replace(/(GITEE_TOKEN|GITHUB_TOKEN|GH_TOKEN|DATABASE_URL)=([^&\s]+)/gi, "$1=<redacted>");
  for (const prefix of home) {
    text = text.split(prefix).join("<user-home>");
  }
  return text;
}

function safeEnv(name: string): string | undefined {
  try {
    const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return maybeProcess?.env?.[name];
  } catch {
    return undefined;
  }
}
