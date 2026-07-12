import assert from "node:assert/strict";
import { reconcileServiceSelection, serviceDirectoryError, serviceManagementError } from "../src/features/toolchains/serviceSelection.ts";

const service = (id, overrides = {}) => ({
  id,
  installed: true,
  serviceName: `svc-${id}`,
  serviceState: "Running",
  pid: 100,
  installDirectory: `C:\\Services\\${id}`,
  pathStatus: "Verified",
  ...overrides,
});

const services = [service("first"), service("middle"), service("last")];

assert.equal(reconcileServiceSelection(services, "first").selected?.id, "first");
assert.equal(reconcileServiceSelection(services, "middle").selected?.id, "middle");
assert.equal(reconcileServiceSelection(services, "last").selected?.id, "last");

const disappeared = reconcileServiceSelection([services[0], services[2]], "middle");
assert.equal(disappeared.selectionLost, true);
assert.equal(disappeared.selectedId, "");

const changed = reconcileServiceSelection([service("middle", { serviceState: "Stopped", pid: 0 })], "middle");
assert.equal(changed.selected?.serviceState, "Stopped");
assert.equal(changed.selected?.pid, 0);
assert.equal(serviceManagementError(changed.selected), "");

const notInstalled = service("missing", { installed: false, serviceName: "", pid: 0 });
assert.match(serviceManagementError(notInstalled), /not installed/);

const inaccessible = service("blocked", { installDirectory: "", pathStatus: "Configured path is inaccessible." });
assert.equal(serviceDirectoryError(inaccessible), "Configured path is inaccessible.");

console.log("Service selection acceptance passed (first, middle, last, lost, changed, no PID, inaccessible path).")
