import assert from "node:assert/strict";
import fs from "node:fs";
import { isCurrentPortGeneration, normalizePortRecords } from "../src/features/ports/portGroups.ts";
import { portRecordKey, selectedPortRecord } from "../src/features/ports/portSafety.ts";

const records = [
  { groupId: "group-ipv4-ipv6", protocol: "TCP", localPort: 5043, pid: 11116 },
  { groupId: "group-other-port", protocol: "TCP", localPort: 5044, pid: 11116 },
  { groupId: "group-other-pid", protocol: "TCP", localPort: 5043, pid: 22222 },
];

assert.equal(portRecordKey(records[0]), "group-ipv4-ipv6");
assert.equal(selectedPortRecord(records, "group-ipv4-ipv6"), records[0]);
assert.equal(records.filter((record) => portRecordKey(record) === "group-ipv4-ipv6").length, 1);
assert.equal(selectedPortRecord(records.slice(1), "group-ipv4-ipv6"), null);

const safetySource = fs.readFileSync(new URL("../src/features/ports/portSafety.ts", import.meta.url), "utf8");
assert.doesNotMatch(safetySource, /record\.protocol.*record\.localPort.*record\.pid/s);
assert.match(safetySource, /return record\.groupId/);

const base = {
  groupId: "fixture-group",
  groupFingerprint: "fixture-fingerprint",
  protocol: "TCP",
  localAddress: "127.0.0.1",
  localPort: 18765,
  remoteAddress: "*",
  state: "LISTENING",
  pid: 1644,
  processStartTime: 899,
  processName: "python.exe",
  friendlyNameZh: "Python",
  friendlyNameEn: "Python",
  processPath: "C:\\Tools\\Python\\python.exe",
  productName: "Python",
  fileDescription: "Python",
  companyName: "Python Software Foundation",
  publisher: "",
  commandLine: "",
  commandLineFingerprint: "empty-command",
  parentPid: 0,
  parentProcessName: "",
  serviceNames: [],
  serviceDisplayNames: [],
  serviceStates: [],
  serviceStartModes: [],
  serviceDetails: [],
  bindings: [{ localAddress: "127.0.0.1", localEndpoint: "127.0.0.1:18765", remoteEndpoint: "*", state: "LISTENING" }],
  bindingCount: 1,
  remoteConnectionCount: 0,
  relatedPorts: [18765],
  sourceRecordCount: 1,
  hasIpv4: true,
  hasIpv6: false,
  scanSources: [{ source: "fixture", scannedAt: 1, recordCount: 1, fallback: false, conflicts: [] }],
  commonUsage: "Python",
  explanation: "fixture",
  risk: "developer-candidate",
  identity: "Python",
  identityId: "python",
  identityCategory: "runtime",
  identityEcosystem: "python",
  confidence: 95,
  confidenceLevel: "verified",
  identityCatalogVersion: "fixture",
  evidenceCount: 0,
  conflictCount: 0,
  riskLevel: "low",
  recommendation: "fixture",
  recommendationZh: "fixture",
  recommendationEn: "fixture",
  evidence: [],
  conflictEvidence: [],
};
const udpIpv4 = {
  ...base,
  groupId: "legacy-udp-4500-ipv4",
  groupFingerprint: "udp-4500-ipv4",
  protocol: "UDP",
  localAddress: "0.0.0.0",
  localPort: 4500,
  state: "BOUND",
  pid: 8496,
  processStartTime: 900,
  processName: "svchost.exe",
  friendlyNameEn: "Windows Service Host: IKE and AuthIP IPsec Keying Modules",
  friendlyNameZh: "Windows 服务宿主：IKE and AuthIP IPsec Keying Modules",
  serviceNames: ["IKEEXT"],
  serviceDisplayNames: ["IKE and AuthIP IPsec Keying Modules"],
  bindings: [{ localAddress: "0.0.0.0", localEndpoint: "0.0.0.0:4500", remoteEndpoint: "*", state: "BOUND" }],
  bindingCount: 1,
  hasIpv4: true,
  hasIpv6: false,
};
const udpIpv6 = {
  ...udpIpv4,
  groupId: "legacy-udp-4500-ipv6",
  groupFingerprint: "udp-4500-ipv6",
  localAddress: "::",
  bindings: [{ localAddress: "::", localEndpoint: "[::]:4500", remoteEndpoint: "*", state: "BOUND" }],
  hasIpv4: false,
  hasIpv6: true,
};
const udpNormalized = normalizePortRecords([udpIpv4, udpIpv6], {
  source: "real-failure-fixture",
  generation: 4,
  cached: false,
  stage: "enrichment",
});
assert.equal(udpNormalized.records.length, 1);
assert.equal(udpNormalized.records[0].bindingCount, 2);
assert.equal(udpNormalized.records[0].hasIpv4, true);
assert.equal(udpNormalized.records[0].hasIpv6, true);
assert.equal(udpNormalized.diagnostics.length, 1);
assert.equal(udpNormalized.diagnostics[0].merged, true);

const serviceDetailBase = {
  name: "IKEEXT",
  displayName: "IKE and AuthIP IPsec Keying Modules",
  state: "Running",
  startMode: "Auto",
  processId: 8496,
  serviceType: "Share Process",
  description: "",
  pathName: "C:\\Windows\\System32\\svchost.exe -k netsvcs",
  serviceHostGroup: "netsvcs",
  serviceDll: "",
  coreWindowsService: true,
};
const serviceQuick = {
  ...udpIpv4,
  serviceNames: ["IKEEXT"],
  serviceDetails: [serviceDetailBase],
  evidence: ["service=IKEEXT"],
  evidenceCount: 1,
};
const serviceEnriched = {
  ...udpIpv6,
  serviceNames: ["BFE", "IKEEXT"],
  serviceDetails: [{
    ...serviceDetailBase,
    description: "Provides keying modules for IPsec.",
    serviceDll: "C:\\Windows\\System32\\ikeext.dll",
  }],
  evidence: ["serviceDll=ikeext.dll"],
  evidenceCount: 1,
};
const serviceNormalized = normalizePortRecords([serviceQuick, serviceEnriched], {
  source: "service-enrichment-fixture",
  generation: 5,
  cached: false,
  stage: "enrichment",
});
assert.equal(serviceNormalized.records.length, 1);
assert.deepEqual(serviceNormalized.records[0].serviceNames, ["BFE", "IKEEXT"]);
assert.equal(serviceNormalized.records[0].serviceDetails.length, 1);
assert.equal(serviceNormalized.records[0].serviceDetails[0].serviceDll, "C:\\Windows\\System32\\ikeext.dll");
assert.equal(serviceNormalized.records[0].evidenceCount, 2);

const postgresQuick = {
  ...base,
  groupId: "port-group-postgres-5043",
  groupFingerprint: "postgres-5043-dual",
  protocol: "TCP",
  localPort: 5043,
  state: "LISTENING",
  pid: 11116,
  processStartTime: 901,
  processName: "postgres.exe",
  friendlyNameEn: "PostgreSQL",
  friendlyNameZh: "PostgreSQL",
  processPath: "",
  bindings: [
    { localAddress: "0.0.0.0", localEndpoint: "0.0.0.0:5043", remoteEndpoint: "0.0.0.0:0", state: "LISTENING" },
    { localAddress: "::", localEndpoint: "[::]:5043", remoteEndpoint: "[::]:0", state: "LISTENING" },
  ],
  bindingCount: 2,
  hasIpv4: true,
  hasIpv6: true,
};
const postgresEnriched = {
  ...postgresQuick,
  processPath: "C:\\PostgreSQL\\bin\\postgres.exe",
  productName: "PostgreSQL Server",
  evidence: ["ProductName=PostgreSQL Server"],
};
const postgresCached = { ...postgresEnriched, scanSources: [...postgresEnriched.scanSources] };
const postgresNormalized = normalizePortRecords([postgresQuick, postgresEnriched, postgresCached], {
  source: "quick+enrichment+cache",
  generation: 5,
  cached: true,
  stage: "cache",
});
assert.equal(postgresNormalized.records.length, 1);
assert.equal(postgresNormalized.records[0].processPath, "C:\\PostgreSQL\\bin\\postgres.exe");
assert.equal(postgresNormalized.records[0].bindingCount, 2);
assert.equal(selectedPortRecord(postgresNormalized.records, "port-group-postgres-5043"), postgresNormalized.records[0]);

const reusedPid = { ...postgresEnriched, groupId: "port-group-postgres-5043-reused", processStartTime: 902 };
const reusedNormalized = normalizePortRecords([postgresEnriched, reusedPid], {
  source: "pid-reuse-fixture",
  generation: 6,
  cached: false,
  stage: "quick",
});
assert.equal(reusedNormalized.records.length, 2);
assert.equal(reusedNormalized.diagnostics[0].merged, false);

const unknownStartOwnerA = {
  ...udpIpv4,
  groupId: "unknown-start-service-a",
  processStartTime: 0,
  commandLine: "svchost.exe -k group-a",
  commandLineFingerprint: "group-a",
  serviceNames: ["ServiceA"],
};
const unknownStartOwnerB = {
  ...udpIpv4,
  groupId: "unknown-start-service-b",
  processStartTime: 0,
  commandLine: "svchost.exe -k group-b",
  commandLineFingerprint: "group-b",
  serviceNames: ["ServiceB"],
};
const unknownStartNormalized = normalizePortRecords([unknownStartOwnerA, unknownStartOwnerB], {
  source: "unknown-start-owner-fixture",
  generation: 7,
  cached: true,
  stage: "cache",
});
assert.equal(unknownStartNormalized.records.length, 2);
assert.equal(unknownStartNormalized.diagnostics[0].merged, false);
assert.equal(isCurrentPortGeneration(7, 7), true);
assert.equal(isCurrentPortGeneration(8, 7), false);

const eventsSource = fs.readFileSync(new URL("../src/features/ports/events.ts", import.meta.url), "utf8");
assert.match(eventsSource, /const generation = \+\+state\.scanGeneration/);
assert.match(eventsSource, /acceptGeneration\(state, generation, "enrichment"\)/);
assert.match(eventsSource, /state\.snapshot\?\.scanId !== enriched\.scanId/);
assert.match(
  eventsSource,
  /const services = await inspectLocalServices\(\);\s+if \(!context\.isCurrent\(\) \|\| !acceptGeneration\(state, generation, "enrichment"\)\) return;\s+state\.services = services;/,
);

console.log("Port grouping acceptance passed (4500/5043 dual-stack grouping, generation gate, stable selection).");
