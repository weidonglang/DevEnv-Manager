import assert from "node:assert/strict";
import fs from "node:fs";
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

console.log("Port grouping acceptance passed (stable groupId selection, no shared protocol:port:pid key).");
