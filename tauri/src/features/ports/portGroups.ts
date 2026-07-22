import type { PortRecord } from "../../types";

export type PortSnapshotStage = "quick" | "enrichment" | "cache" | "verification";

export type PortGroupDiagnostic = {
  type: "duplicate-visible-port-group";
  visualKey: string;
  groupIds: string[];
  differingFields: string[];
  source: string;
  generation: number;
  cached: boolean;
  enrichment: boolean;
  merged: boolean;
};

export type NormalizePortRecordsContext = {
  source: string;
  generation: number;
  cached: boolean;
  stage: PortSnapshotStage;
};

export function portVisualOperationKey(record: Pick<PortRecord, "protocol" | "localPort" | "pid" | "state">): string {
  return [record.protocol.trim().toUpperCase(), record.localPort, record.pid, record.state.trim().toUpperCase()].join(":");
}

export function isCurrentPortGeneration(activeGeneration: number, resultGeneration: number): boolean {
  return activeGeneration === resultGeneration;
}

export function normalizePortRecords(
  records: PortRecord[],
  context: NormalizePortRecordsContext,
): { records: PortRecord[]; diagnostics: PortGroupDiagnostic[] } {
  const diagnostics: PortGroupDiagnostic[] = [];
  const byGroupId = new Map<string, PortRecord>();

  for (const record of records) {
    const existing = byGroupId.get(record.groupId);
    if (!existing) {
      byGroupId.set(record.groupId, clonePortRecord(record));
      continue;
    }
    diagnostics.push(diagnostic(existing, record, context, true));
    byGroupId.set(record.groupId, mergePortRecords(existing, record));
  }

  const normalized: PortRecord[] = [];
  const visualIndex = new Map<string, number>();
  for (const record of byGroupId.values()) {
    const visualKey = portVisualOperationKey(record);
    const existingIndex = visualIndex.get(visualKey);
    if (existingIndex === undefined) {
      visualIndex.set(visualKey, normalized.length);
      normalized.push(record);
      continue;
    }
    const existing = normalized[existingIndex];
    const compatible = arePortRecordsOperationallyCompatible(existing, record);
    diagnostics.push(diagnostic(existing, record, context, compatible));
    if (compatible) normalized[existingIndex] = mergePortRecords(existing, record);
    else normalized.push(record);
  }

  return { records: normalized, diagnostics };
}

export function arePortRecordsOperationallyCompatible(left: PortRecord, right: PortRecord): boolean {
  if (left.processStartTime && right.processStartTime && left.processStartTime !== right.processStartTime) return false;
  if (left.processPath && right.processPath && normalizePath(left.processPath) !== normalizePath(right.processPath)) return false;
  const leftServices = stableStrings(left.serviceNames);
  const rightServices = stableStrings(right.serviceNames);
  if (leftServices.length && rightServices.length) {
    const sameProcessStart = left.processStartTime > 0 && left.processStartTime === right.processStartTime;
    const sameCommand = Boolean(left.commandLine && right.commandLine)
      && left.commandLineFingerprint === right.commandLineFingerprint;
    const overlaps = leftServices.some((service) => rightServices.includes(service));
    if (!sameProcessStart && !sameCommand && !overlaps) return false;
  }
  return true;
}

function mergePortRecords(left: PortRecord, right: PortRecord): PortRecord {
  const preferred = recordRichness(right) > recordRichness(left) ? right : left;
  const fallback = preferred === right ? left : right;
  const bindings = uniqueBy(
    [...left.bindings, ...right.bindings],
    (binding) => `${binding.localAddress}\0${binding.localEndpoint}\0${binding.remoteEndpoint}\0${binding.state}`,
  );
  const scanSources = uniqueBy(
    [...left.scanSources, ...right.scanSources],
    (source) => `${source.source}\0${source.scannedAt}\0${source.recordCount}\0${source.fallback}`,
  );
  const evidence = stableStrings([...left.evidence, ...right.evidence]);
  const conflictEvidence = stableStrings([...left.conflictEvidence, ...right.conflictEvidence]);
  return {
    ...fallback,
    ...preferred,
    groupId: preferred.groupId || fallback.groupId,
    groupFingerprint: preferred.groupFingerprint || fallback.groupFingerprint,
    processStartTime: preferred.processStartTime || fallback.processStartTime,
    processName: preferred.processName || fallback.processName,
    friendlyNameZh: preferred.friendlyNameZh || fallback.friendlyNameZh,
    friendlyNameEn: preferred.friendlyNameEn || fallback.friendlyNameEn,
    processPath: preferred.processPath || fallback.processPath,
    productName: preferred.productName || fallback.productName,
    fileDescription: preferred.fileDescription || fallback.fileDescription,
    companyName: preferred.companyName || fallback.companyName,
    publisher: preferred.publisher || fallback.publisher,
    commandLine: preferred.commandLine || fallback.commandLine,
    commandLineFingerprint: preferred.commandLine ? preferred.commandLineFingerprint : fallback.commandLineFingerprint,
    parentPid: preferred.parentPid || fallback.parentPid,
    parentProcessName: preferred.parentProcessName || fallback.parentProcessName,
    serviceNames: stableStrings([...left.serviceNames, ...right.serviceNames]),
    serviceDisplayNames: stableStrings([...left.serviceDisplayNames, ...right.serviceDisplayNames]),
    serviceStates: stableStrings([...left.serviceStates, ...right.serviceStates]),
    serviceStartModes: stableStrings([...left.serviceStartModes, ...right.serviceStartModes]),
    serviceDetails: mergeServiceDetails([...left.serviceDetails, ...right.serviceDetails]),
    bindings,
    bindingCount: bindings.length,
    remoteConnectionCount: Math.max(left.remoteConnectionCount, right.remoteConnectionCount),
    relatedPorts: [...new Set([...left.relatedPorts, ...right.relatedPorts])].sort((a, b) => a - b),
    sourceRecordCount: Math.max(left.sourceRecordCount, right.sourceRecordCount),
    hasIpv4: left.hasIpv4 || right.hasIpv4,
    hasIpv6: left.hasIpv6 || right.hasIpv6,
    scanSources,
    evidenceCount: evidence.length,
    conflictCount: conflictEvidence.length,
    evidence,
    conflictEvidence,
  };
}

function mergeServiceDetails(items: PortRecord["serviceDetails"]): PortRecord["serviceDetails"] {
  const byService = new Map<string, PortRecord["serviceDetails"][number]>();
  for (const item of items) {
    const key = (item.name || `${item.displayName}\0${item.processId}`).trim().toLocaleLowerCase();
    const existing = byService.get(key);
    if (!existing) {
      byService.set(key, { ...item });
      continue;
    }
    const preferred = serviceDetailRichness(item) > serviceDetailRichness(existing) ? item : existing;
    const fallback = preferred === item ? existing : item;
    byService.set(key, {
      ...fallback,
      ...preferred,
      name: preferred.name || fallback.name,
      displayName: preferred.displayName || fallback.displayName,
      state: preferred.state || fallback.state,
      startMode: preferred.startMode || fallback.startMode,
      processId: preferred.processId || fallback.processId,
      serviceType: preferred.serviceType || fallback.serviceType,
      description: preferred.description || fallback.description,
      pathName: preferred.pathName || fallback.pathName,
      serviceHostGroup: preferred.serviceHostGroup || fallback.serviceHostGroup,
      serviceDll: preferred.serviceDll || fallback.serviceDll,
      coreWindowsService: preferred.coreWindowsService || fallback.coreWindowsService,
    });
  }
  return Array.from(byService.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function serviceDetailRichness(service: PortRecord["serviceDetails"][number]): number {
  return [
    service.name,
    service.displayName,
    service.state,
    service.startMode,
    service.serviceType,
    service.description,
    service.pathName,
    service.serviceHostGroup,
    service.serviceDll,
  ].filter(Boolean).length + Number(service.processId > 0) + Number(service.coreWindowsService);
}

function recordRichness(record: PortRecord): number {
  return [
    record.processStartTime > 0,
    Boolean(record.processPath),
    Boolean(record.commandLine),
    Boolean(record.productName || record.fileDescription || record.companyName || record.publisher),
    record.serviceNames.length > 0,
    record.serviceDisplayNames.length > 0,
    record.serviceDetails.length > 0,
    record.evidence.length > 0,
  ].filter(Boolean).length * 100 + record.bindings.length;
}

function diagnostic(
  left: PortRecord,
  right: PortRecord,
  context: NormalizePortRecordsContext,
  merged: boolean,
): PortGroupDiagnostic {
  return {
    type: "duplicate-visible-port-group",
    visualKey: portVisualOperationKey(left),
    groupIds: [...new Set([left.groupId, right.groupId])],
    differingFields: differingFields(left, right),
    source: context.source,
    generation: context.generation,
    cached: context.cached,
    enrichment: context.stage === "enrichment",
    merged,
  };
}

function differingFields(left: PortRecord, right: PortRecord): string[] {
  const fields: Array<keyof PortRecord> = [
    "groupId",
    "groupFingerprint",
    "localAddress",
    "remoteAddress",
    "processStartTime",
    "processName",
    "processPath",
    "commandLineFingerprint",
    "serviceNames",
    "serviceDisplayNames",
    "serviceDetails",
    "bindingCount",
    "sourceRecordCount",
    "hasIpv4",
    "hasIpv6",
  ];
  return fields.filter((field) => JSON.stringify(left[field]) !== JSON.stringify(right[field])).map(String);
}

function clonePortRecord(record: PortRecord): PortRecord {
  return {
    ...record,
    serviceNames: [...record.serviceNames],
    serviceDisplayNames: [...record.serviceDisplayNames],
    serviceStates: [...record.serviceStates],
    serviceStartModes: [...record.serviceStartModes],
    serviceDetails: record.serviceDetails.map((service) => ({ ...service })),
    bindings: record.bindings.map((binding) => ({ ...binding })),
    relatedPorts: [...record.relatedPorts],
    scanSources: record.scanSources.map((source) => ({ ...source, conflicts: [...source.conflicts] })),
    evidence: [...record.evidence],
    conflictEvidence: [...record.conflictEvidence],
  };
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function stableStrings(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function normalizePath(value: string): string {
  return value.trim().replace(/\//g, "\\").toLocaleLowerCase();
}
