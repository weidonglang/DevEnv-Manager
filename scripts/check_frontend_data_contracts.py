from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tauri" / "src"


def fail(message: str) -> int:
    print(f"Frontend data contract check failed: {message}")
    return 1


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> int:
    required_adapters = [
        "tauri/src/features/dashboard/viewModel.ts",
        "tauri/src/features/runtimes/viewModel.ts",
        "tauri/src/features/environment/viewModel.ts",
        "tauri/src/features/projects/viewModel.ts",
    ]
    for rel in required_adapters:
        if not (ROOT / rel).is_file():
            return fail(f"missing view-model adapter: {rel}")

    forbidden_snippets = {
        "tauri/src/features/runtimes/render.ts": [
            'valueOf(runtime, "path"',
            'valueOf(runtime, "current"',
            'valueOf(runtime, "validationStatus"',
            "validationStatus",
            'data-runtime-kind="${escapeHtml(runtime.kind)}"',
        ],
        "tauri/src/features/environment/render.ts": [
            "valueOf(state.reliability",
            "renderObjectTable(state.reliability",
            "pathFirstJar",
            '"processJavaHome"',
            '"registryJavaHome"',
        ],
        "tauri/src/features/projects/render.ts": [
            "valueOf(state.analysis",
            "renderObjectTable(state.analysis",
            '"projectType"',
            '"recommendedJdk"',
            '"jdkRequirement"',
            '"framework"',
            '"signals"',
        ],
        "tauri/src/features/projects/events.ts": [
            '"previewId"',
            '"port", "0"',
        ],
        "tauri/src/features/toolchains/render.ts": [
            "renderObjectTable(state.report",
            "git.git.status",
            "node.npmRegistry",
            "python.pipIndexUrl",
            '"generatedAt"',
            '"conclusion"',
        ],
        "tauri/src/features/reports/render.ts": [
            'valueOf(state.doctor',
            "renderObjectTable(state.doctor",
        ],
        "tauri/src/features/settings/render.ts": [
            "renderObjectTable(state.update",
            "renderObjectTable(state.powershell",
            "currentVersion",
            "latestVersion",
            "sourceName",
            "sourceUrl",
            "checkedAt",
        ],
    }
    for rel, snippets in forbidden_snippets.items():
        text = read(rel)
        for snippet in snippets:
            if snippet in text:
                return fail(f"{rel} still contains forbidden stale contract snippet: {snippet}")

    runtime_render = read("tauri/src/features/runtimes/render.ts")
    runtime_events = read("tauri/src/features/runtimes/events.ts")
    if "runtime.managed ? renderManagedActions(runtime) : renderExternalActions(runtime)" not in runtime_render:
        return fail("Runtimes must render managed and external runtimes through separate action paths")
    for required in ["createRuntimeSwitchPlan", "executeRuntimeSwitchPlan", "uninstallRuntime(kind, version, path"]:
        if required not in runtime_events:
            return fail(f"Managed runtime actions must execute through plan/token-gated API calls: {required}")
    if "data-runtime-action" not in runtime_events:
        return fail("Runtime row actions must be bound from rendered rows")
    for required in ["runtime-group-java", "runtime-group-python", "runtime-group-node", "runtime-group-go", "runtime-group-maven", "runtime-group-gradle", "runtime-group-rust", "runtime-group-dotnet"]:
        if required not in runtime_render:
            return fail(f"Runtimes discovery must render ecosystem groups: {required}")
    for required in ["node-version", "python-version", "go-version", "install-maven", "install-gradle", '"install_maven"', '"install_gradle"']:
        if required not in runtime_render + runtime_events:
            return fail(f"Runtimes must expose multi-runtime install controls: {required}")

    environment_render = read("tauri/src/features/environment/render.ts")
    environment_events = read("tauri/src/features/environment/events.ts")
    if "toEnvironmentViewModel" not in environment_render:
        return fail("Environment render must use the EnvReliabilitySnapshot adapter")
    if "Promise.allSettled" not in environment_events or "state.errors.reliability" not in environment_events:
        return fail("Environment refresh must isolate per-source backend failures")
    if 'planId: "cleanup-path-entries"' not in environment_events:
        return fail("Environment PATH cleanup must use backend-matching cleanup-path-entries plan ID")

    project_render = read("tauri/src/features/projects/render.ts")
    project_events = read("tauri/src/features/projects/events.ts")
    if "toProjectViewModel" not in project_render:
        return fail("Projects render must use the ProjectAnalysis adapter")
    for required in ["state.idea", "state.javaConsumer", "state.traces", "currentPort", "renderAndBind(context, state)"]:
        if required not in project_events + project_render:
            return fail(f"Projects must render result-bearing workflow output: {required}")
    if "projectConfigurationPlanId(request)" not in project_events or "switches: preview.current" not in project_events:
        return fail("Projects must build apply request and plan ID to match backend contract")

    dashboard_render = read("tauri/src/features/dashboard/render.ts")
    if "toDashboardViewModel" not in dashboard_render:
        return fail("Dashboard render must use AppSnapshot/health adapter instead of stale root/tools fields")

    ports_render = read("tauri/src/features/ports/render.ts")
    ports_events = read("tauri/src/features/ports/events.ts")
    if "pageItems(rows" not in ports_render or 'renderPagination("ports"' not in ports_render:
        return fail("Ports table must be paginated")
    if "state.page = 1" not in ports_events or "ports:next" not in ports_events:
        return fail("Ports pagination must reset on filter and bind next/previous controls")
    ports_safety = read("tauri/src/features/ports/portSafety.ts")
    if "return record.groupId" not in ports_safety:
        return fail("Ports selection must use the backend stable groupId")
    if "`${record.protocol}:${record.localPort}:${record.pid}`" in ports_safety:
        return fail("Ports must not reuse protocol:port:pid as a row selection key")
    ports_api = read("tauri/src/features/ports/api.ts")
    if 'create_port_resolution_plan", { groupId }' not in ports_api:
        return fail("Port plan creation must target a stable groupId")

    file_association_render = read("tauri/src/features/fileAssociations/render.ts")
    file_association_events = read("tauri/src/features/fileAssociations/events.ts")
    if 'riskLevel: plan.riskLevel' not in file_association_render:
        return fail("File association plan must render the backend operation risk level")
    if 'backupReceipt: state.plan.backupPath' not in file_association_events:
        return fail("File association apply token must use FileAssociationPlan.backupPath")
    if 'valueOf(state.plan, "backupName"' in file_association_events:
        return fail("File association apply must not read nonexistent FileAssociationPlan.backupName")
    if file_association_events.count("await reloadAssociationBackups(context, state);") < 2:
        return fail("File association apply and rollback must refresh the durable backup list")
    if "item.backupId === appliedBackupId" not in file_association_events:
        return fail("File association rollback must target the backup ID returned by the apply receipt")
    if "state.operationError = t(\"toast.createAssociationPlanFirst\")" not in file_association_events:
        return fail("File association apply-without-plan guidance must render a persistent inline error")

    feature_guide = read("tauri/src/components/featureGuide.ts")
    if "${item.risk}</span>" in feature_guide or "riskSummary(item)" not in feature_guide:
        return fail("Feature guide risk chip must show full risk context, not raw high/medium tokens")

    adapter_markers = {
        "toolchains": "toToolchainViewModel",
        "reports": "toReportsViewModel",
    }
    for feature, marker in adapter_markers.items():
        render = read(f"tauri/src/features/{feature}/render.ts")
        if marker not in render:
            return fail(f"{feature} render must use a view-model adapter")
    if "toSettingsViewModel" not in read("tauri/src/features/settings/render.ts"):
        return fail("Settings render must use a view-model adapter")
    if "SystemTime::now())" in read("tauri/src-tauri/src/lib.rs"):
        return fail("Backend must not serialize SystemTime debug output into user-visible timestamps")

    bootstrap = read("tauri/src/app/bootstrap.ts")
    feature_context = read("tauri/src/app/featureContext.ts")
    if "currentNavigationId" not in bootstrap or "navigationId" not in feature_context or "isCurrent" not in feature_context:
        return fail("Workbench mount must expose navigationId/isCurrent stale navigation guard")
    for rel in [
        "tauri/src/features/runtimes/events.ts",
        "tauri/src/features/environment/events.ts",
        "tauri/src/features/ports/events.ts",
        "tauri/src/features/projects/events.ts",
        "tauri/src/features/toolchains/events.ts",
        "tauri/src/features/settings/events.ts",
    ]:
        if "context.isCurrent()" not in read(rel):
            return fail(f"async feature events must check context.isCurrent before DOM writes: {rel}")

    ports_events = read("tauri/src/features/ports/events.ts")
    if "compositionstart" not in ports_events or "compositionend" not in ports_events or "updatePortsTable" not in ports_events:
        return fail("Ports search must support IME composition and local table updates")
    input_handler_slice = ports_events.split('filter?.addEventListener("input"', 1)[-1].split("});", 1)[0]
    if "context.root.innerHTML" in input_handler_slice:
        return fail("Ports search input handler must not rebuild the feature root")

    if "debugLog.ts" not in "\n".join(path.relative_to(ROOT).as_posix() for path in SRC.rglob("*.ts")):
        return fail("Debug log core must exist")
    debug_log = read("tauri/src/core/debugLog.ts")
    for required in ["navigationId", "operationId", "parentOperationId", "relatedCommand", "sanitizedArgs", "sanitizedResult", "sanitizedError"]:
        if required not in debug_log:
            return fail(f"Debug log entries must include {required}")
    for required_type in ['"input"', '"search"', '"pagination"', '"token"', '"export"']:
        if required_type not in debug_log:
            return fail(f"Debug log event types must include {required_type}")
    shared_view = read("tauri/src/features/sharedView.ts")
    if "logDebug({ type: \"click\"" not in shared_view:
        return fail("Workbench data-action clicks must be recorded in the local debug timeline")
    settings_render = read("tauri/src/features/settings/render.ts")
    if "isAdvancedMode()" not in settings_render or "renderDebugPanel" not in settings_render:
        return fail("Settings must hide/show Debug panel through Advanced mode")
    settings_events = read("tauri/src/features/settings/events.ts")
    if "filterDebugEntries" not in settings_events or "debug-filter-type" not in settings_render or "debug-search" not in settings_render:
        return fail("Debug panel must support type/status/current-page filters and text search")
    bootstrap = read("tauri/src/app/bootstrap.ts")
    if "bindDebugEventCapture" not in bootstrap or "document.addEventListener(\"input\"" not in bootstrap or "[data-page-action]" not in bootstrap:
        return fail("Workbench must capture input/search/change/pagination events into the debug timeline")
    cleanup_render = read("tauri/src/features/cleanup/render.ts")
    cleanup_events = read("tauri/src/features/cleanup/events.ts")
    if 'renderPagination("cleanup-large-files"' not in cleanup_render or "inspect-c-drive-rescue" not in cleanup_render:
        return fail("Cleanup must expose paginated C drive rescue and large-file inspection")
    if 'command: "execute_expansion_plan"' not in cleanup_events or "executeCDriveExpansion" not in cleanup_events:
        return fail("C drive expansion must use the execute_expansion_plan token contract")
    if 'command: "execute_cleanup_plan"' not in cleanup_events or "cleanSelectedTargets" not in cleanup_events:
        return fail("Cleanup execution must use the execute_cleanup_plan token contract")
    if 'planId: "clear-download-cache"' not in cleanup_events or 'planId: "tool-npm"' not in cleanup_events:
        return fail("Cleanup cache actions must use backend-matching plan IDs")
    toolchain_events = read("tauri/src/features/toolchains/events.ts")
    mysql_guard_fields = [
        "mysqlPendingExecutionGuard(state.mysqlPlan.planId)",
        "planId: guard.planId",
        "actionId: guard.actionId",
        "riskLevel: guard.riskLevel",
        "planFingerprint: guard.planFingerprint",
        "backupRequired: guard.backupRequired",
        "backupReceipt: guard.backupReceipt",
    ]
    if any(field not in toolchain_events for field in mysql_guard_fields):
        return fail("MySQL repair must pass every backend execution-guard field into token creation")
    if 'createMySqlRepairPlan(candidate.id, "repair")' in toolchain_events:
        return fail("MySQL repair must not use the unsupported hard-coded repair action")
    if "createMySqlRepairPlan(candidate.id, state.mysqlAction)" not in toolchain_events or "state.mysqlBackupDestination.trim()" not in toolchain_events:
        return fail("MySQL repair must bind the selected action and backup destination to plan execution")
    toolchain_render = read("tauri/src/features/toolchains/render.ts")
    for selector in ["toolchains-mysql-candidate-select", "toolchains-mysql-action-select", "toolchains-mysql-backup-destination", "toolchains-mysql-plan-preview", "toolchains-mysql-result"]:
        if selector not in toolchain_render:
            return fail(f"MySQL repair is missing durable UI selector {selector}")
    if 'id="mysql-backup-destination"' not in toolchain_render or 'id="mysql-backup-destination" data-testid="toolchains-mysql-backup-destination" value="${escapeHtml(state.mysqlBackupDestination)}" readonly' not in toolchain_render:
        return fail("MySQL backup destination must be selected through a read-only directory field")
    directory_inputs = {
        "tauri/src/features/cleanup/render.ts": ["cleanup-move-source", "cleanup-duplicate-scan-root"],
        "tauri/src/features/settings/render.ts": ["settings-root"],
        "tauri/src/features/projects/render.ts": ["project-path"],
    }
    for path, element_ids in directory_inputs.items():
        text = read(path)
        for element_id in element_ids:
            match = re.search(rf'<input[^>]*id="{re.escape(element_id)}"[^>]*>', text)
            if not match or "readonly" not in match.group(0):
                return fail(f"Directory input {element_id} must be picker-backed and read-only")

    print("Frontend data contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
