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
  "runtime-switch-target-root",
  "runtime-switch-plan-created",
  "runtime-switch-plan-error",
  "runtime-switch-failure-stage",
  "runtime-switch-next-step",
  "runtime-switch-plan-execute",
  "runtime-switch-plan-cancel",
  "runtime-switch-plan-recreate",
  "runtime-switch-plan-export",
  "runtime-switch-plan-view-diff",
  "runtime-switch-backup-section",
  "runtime-switch-backup-select",
  "runtime-switch-backup-detail",
  "runtime-switch-backup-restore",
  "runtime-row-switch-status",
  "runtime-external-switch-blocker",
  "runtime-external-switch-disabled",
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
assert.match(eventSource, /state\.switchFailureStage = "planning"/);
assert.match(eventSource, /state\.switchFailureStage = "execution"/);
assert.match(eventSource, /state\.switchInlineError = errorMessage\(error\)/);
assert.match(eventSource, /state\.switchNextStep = runtimeSwitchNextStep/);
assert.match(eventSource, /open\(\{ directory: true, multiple: false \}\)/);
assert.match(eventSource, /cancelRuntimeSwitchPlan\(previousPlanId\)/);
assert.match(eventSource, /exportRuntimeSwitchPlan\(planId\)/);
assert.match(eventSource, /restoreRuntimeSwitchBackup\(backupId, confirmationToken\)/);
assert.match(eventSource, /listRuntimeSwitchBackups\(\)/);
assert.match(
  eventSource,
  /refreshRuntimes[\s\S]*const \[runtimes, distributions, strongVerification, switchBackups\] = await loadRuntimeData\(\);[\s\S]*applyRuntimeSwitchBackups\(state, switchBackups\)/,
  "initial Runtime page load must retain persistent switch backups",
);
assert.match(
  eventSource,
  /function applyRuntimeSwitchBackups[\s\S]*state\.switchBackups = switchBackups[\s\S]*backup\.restorable/,
  "initial and post-operation refreshes must share the verified backup selection adapter",
);

assert.match(apiSource, /\{ runtimeId, switchMode, projectRoot \}/);
assert.match(apiSource, /"cancel_runtime_switch_plan", \{ planId \}/);
assert.match(apiSource, /"export_runtime_switch_plan", \{ planId \}/);
assert.match(apiSource, /"restore_runtime_switch_backup", \{ backupId, confirmationToken \}/);
assert.match(apiSource, /"list_runtime_switch_backups"/);
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
  "provider_managed_node_runtime",
  "cancel_runtime_switch_plan",
  "export_runtime_switch_plan",
  "create_runtime_switch_backup",
  "load_runtime_switch_backup",
  "list_runtime_switch_backups",
  "restore_runtime_switch_backup",
]) {
  assert.match(backendSource, new RegExp(contract), `${contract} backend contract is required`);
}

console.log("Runtime switch acceptance passed (durable plan controls, trusted identity, provider boundary, recovery entry).");
