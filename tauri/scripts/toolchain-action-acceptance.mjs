import assert from "node:assert/strict";
import { selectedToolchainAction, toolchainActionDefinitions, toolchainActionPlanId } from "../src/features/toolchains/toolchainActions.ts";

const ids = toolchainActionDefinitions.map((action) => action.id);
assert.equal(new Set(ids).size, ids.length, "toolchain action IDs must be unique");

for (const action of toolchainActionDefinitions) {
  assert.ok(action.ecosystem);
  assert.ok(action.commandPreview);
  assert.ok(action.timeoutSeconds > 0);
  assert.ok(["readOnly", "high"].includes(action.riskLevel));
}

assert.equal(selectedToolchainAction("git_test_ssh").readOnly, true);
assert.equal(toolchainActionPlanId(selectedToolchainAction("git_identity"), " Alice ", " alice@example.invalid "), "git_identity:Alice:alice@example.invalid");
assert.equal(toolchainActionPlanId(selectedToolchainAction("rust_update"), "", ""), "rust_update:");
assert.equal(selectedToolchainAction("not-an-action").id, "git_test_ssh");

console.log(`Toolchain action acceptance passed (${ids.length} fixed actions, exact plan IDs, no free-form action IDs).`);
