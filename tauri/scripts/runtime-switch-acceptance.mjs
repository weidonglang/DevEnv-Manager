import assert from "node:assert/strict";
import fs from "node:fs";

const renderSource = fs.readFileSync(
  new URL("../src/features/runtimes/render.ts", import.meta.url),
  "utf8",
);
const eventSource = fs.readFileSync(
  new URL("../src/features/runtimes/events.ts", import.meta.url),
  "utf8",
);
const apiSource = fs.readFileSync(
  new URL("../src/features/runtimes/api.ts", import.meta.url),
  "utf8",
);
const backendSource = fs.readFileSync(
  new URL("../src-tauri/src/lib.rs", import.meta.url),
  "utf8",
);

for (const selector of [
  "runtime-switch-plan-status",
  "runtime-switch-target",
  "runtime-switch-plan-created",
  "runtime-switch-plan-error",
  "runtime-switch-plan-execute",
  "runtime-row-switch-status",
  "runtime-external-switch-blocker",
  "runtime-project-root-choose",
]) {
  assert.match(
    renderSource,
    new RegExp(`data-testid="${selector}"`),
    `${selector} must remain stable`,
  );
}

assert.match(
  renderSource,
  /data-runtime-id="\$\{escapeHtml\(runtime\.id\)\}"/,
  "runtime actions must carry a stable backend runtime ID",
);
assert.match(
  renderSource,
  /data-runtime-switch-mode="\$\{escapeHtml\(runtime\.switchMode \|\| ""\)\}"/,
  "runtime actions must carry an allowlisted switch mode",
);
assert.match(
  renderSource,
  /runtime\.managed \? renderManagedActions[\s\S]*renderExternalActions/,
  "managed and external action boundaries must remain separate",
);
assert.match(
  renderSource,
  /runtime\.switchEligible && runtime\.switchMode[\s\S]*Use in current user environment/,
  "only eligible external runtimes may expose user-environment adoption",
);

assert.match(
  eventSource,
  /state\.switchPhase = "planning";[\s\S]*renderAndBind\(context, state\);[\s\S]*await createRuntimeSwitchPlan/,
  "planning state must render before the backend request is awaited",
);
assert.match(eventSource, /requestId !== state\.switchRequestId/);
assert.match(eventSource, /focusSwitchWorkflow\(context\)/);
assert.match(eventSource, /state\.switchPhase = "failed"/);
assert.match(eventSource, /state\.switchInlineError = errorMessage\(error\)/);
assert.match(eventSource, /open\(\{ directory: true, multiple: false \}\)/);

assert.match(apiSource, /\{ runtimeId, switchMode, projectRoot \}/);
assert.doesNotMatch(
  apiSource,
  /create_runtime_switch_plan"[\s\S]{0,120}\{ kind, version, path \}/,
  "plan creation must not trust frontend path/version identity",
);

for (const contract of [
  "resolve_trusted_runtime_candidate",
  "runtime_switch_state_fingerprint",
  "verification_fingerprint",
  "expires_at",
  "rollback_runtime_switch",
  "write_dotnet_global_json",
  "rustup_toolchain_name",
]) {
  assert.match(backendSource, new RegExp(contract), `${contract} backend contract is required`);
}

console.log(
  "Runtime switch acceptance passed (stable identity, immediate durable state, external boundary, project selector).",
);
