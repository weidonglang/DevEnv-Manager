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
const MAX_ENTRIES = 200;
const MAX_STORAGE_CHARS = 256 * 1024;
const MAX_TEXT_CHARS = 2_000;
const MAX_ARRAY_ITEMS = 12;
const MAX_OBJECT_KEYS = 30;
const MAX_OBJECT_DEPTH = 4;
let currentView: string | undefined;
let currentNavigationId: number | undefined;
let memoryEntries: DebugLogEntry[] | undefined;

export function isAdvancedMode(): boolean {
  try {
    return localStorage.getItem(ADVANCED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdvancedMode(enabled: boolean): void {
  try {
    localStorage.setItem(ADVANCED_KEY, enabled ? "true" : "false");
  } catch {
    // Debug storage is expendable; application settings must remain writable.
    removeStoredDebugEntries();
    try {
      localStorage.setItem(ADVANCED_KEY, enabled ? "true" : "false");
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }
  dispatchDebugEvent("devenv:advanced-mode-change", enabled);
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
    data: undefined,
    sanitizedArgs,
    detail,
    message: detail,
    sanitizedResult: sanitize(entry.sanitizedResult),
    sanitizedError: sanitize(entry.sanitizedError),
  };
  const entries = getDebugEntries();
  entries.unshift(item);
  persistDebugEntries(entries);
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
    data: undefined,
    sanitizedResult: status === "success" ? sanitize(data ?? entry.sanitizedResult ?? entry.data) : entry.sanitizedResult,
    sanitizedError: status === "failed" || status === "timeout" ? sanitize(detail ?? data ?? entry.sanitizedError) : entry.sanitizedError,
  };
  if (index >= 0) entries[index] = next;
  else entries.unshift(next);
  persistDebugEntries(entries);
}

export function getDebugEntries(): DebugLogEntry[] {
  if (memoryEntries) return memoryEntries.slice();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    memoryEntries = Array.isArray(raw)
      ? raw.slice(0, MAX_ENTRIES).map((entry) => compactEntry(entry as DebugLogEntry))
      : [];
  } catch {
    memoryEntries = [];
  }
  return memoryEntries.slice();
}

export function clearDebugEntries(): void {
  memoryEntries = [];
  removeStoredDebugEntries();
  dispatchDebugEvent("devenv:debug-log-change");
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
    if (entry.sanitizedArgs !== undefined) lines.push(`- Args: \`${JSON.stringify(entry.sanitizedArgs)}\``);
    if (entry.sanitizedResult !== undefined) lines.push(`- Result: \`${JSON.stringify(entry.sanitizedResult)}\``);
    if (entry.data !== undefined) lines.push(`- Data: \`${JSON.stringify(entry.data)}\``);
    if (entry.sanitizedError !== undefined) lines.push(`- Error: \`${JSON.stringify(entry.sanitizedError)}\``);
    lines.push("");
  }
  return lines.join("\n");
}

function persistDebugEntries(entries: DebugLogEntry[]): void {
  const compacted = entries.slice(0, MAX_ENTRIES).map(compactEntry);
  let retained = compacted;
  let serialized = JSON.stringify(retained);
  while (serialized.length > MAX_STORAGE_CHARS && retained.length > 1) {
    retained = retained.slice(0, Math.max(1, Math.floor(retained.length * 0.75)));
    serialized = JSON.stringify(retained);
  }
  if (serialized.length > MAX_STORAGE_CHARS) {
    retained = [compactEntry({ ...retained[0], data: undefined, sanitizedArgs: undefined, sanitizedResult: undefined, sanitizedError: undefined })];
    serialized = JSON.stringify(retained);
  }

  memoryEntries = retained;
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Replacing a legacy quota-sized value can fail before the browser reclaims it.
    removeStoredDebugEntries();
    let fallback = retained.slice(0, Math.min(25, retained.length));
    while (fallback.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        break;
      } catch {
        fallback = fallback.slice(0, Math.floor(fallback.length / 2));
      }
    }
  }
  dispatchDebugEvent("devenv:debug-log-change");
}

function compactEntry(entry: DebugLogEntry): DebugLogEntry {
  const sanitizedArgs = sanitize(entry.sanitizedArgs);
  const sanitizedResult = sanitize(entry.sanitizedResult);
  const sanitizedError = sanitize(entry.sanitizedError);
  return {
    ...entry,
    id: sanitizeText(entry.id),
    eventId: sanitizeText(entry.eventId),
    name: sanitizeText(entry.name),
    eventName: sanitizeText(entry.eventName),
    view: optionalText(entry.view),
    feature: optionalText(entry.feature),
    message: optionalText(entry.message),
    detail: optionalText(entry.detail),
    operationId: optionalText(entry.operationId),
    parentOperationId: optionalText(entry.parentOperationId),
    relatedCommand: optionalText(entry.relatedCommand),
    command: optionalText(entry.command),
    planId: optionalText(entry.planId),
    riskLevel: optionalText(entry.riskLevel),
    data: sanitizedArgs !== undefined || sanitizedResult !== undefined || sanitizedError !== undefined ? undefined : sanitize(entry.data),
    sanitizedArgs,
    sanitizedResult,
    sanitizedError,
  };
}

function sanitize(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "<circular>";
  if (depth >= MAX_OBJECT_DEPTH) {
    return Array.isArray(value)
      ? `<array:${value.length}>`
      : `<object:${Object.keys(value as Record<string, unknown>).length}>`;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) result.push(`<${value.length - MAX_ARRAY_ITEMS} more items>`);
    return result;
  }
  const result: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, child] of entries.slice(0, MAX_OBJECT_KEYS)) {
    const lower = key.toLowerCase();
    if (["token", "password", "secret", "cookie", "authorization", "confirmationtoken"].some((marker) => lower.includes(marker))) {
      result[key] = "<redacted>";
    } else {
      result[key] = sanitize(child, depth + 1, seen);
    }
  }
  if (entries.length > MAX_OBJECT_KEYS) result._truncatedKeys = entries.length - MAX_OBJECT_KEYS;
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
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS)}... <truncated ${text.length - MAX_TEXT_CHARS} chars>`;
}

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return sanitizeText(value);
}

function removeStoredDebugEntries(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function dispatchDebugEvent(name: string, detail?: unknown): void {
  try {
    window.dispatchEvent(new CustomEvent(name, detail === undefined ? undefined : { detail }));
  } catch {
    // Debug notifications are best effort and must never affect product actions.
  }
}

function safeEnv(name: string): string | undefined {
  try {
    const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return maybeProcess?.env?.[name];
  } catch {
    return undefined;
  }
}
