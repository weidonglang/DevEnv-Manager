from __future__ import annotations

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
    if "switchRuntime(kind, version, path" not in runtime_events or "uninstallRuntime(kind, version, path" not in runtime_events:
        return fail("Managed runtime switch/uninstall buttons must execute through token-gated API calls")
    if "data-runtime-action" not in runtime_events:
        return fail("Runtime row actions must be bound from rendered rows")
    if "pageItems(vm.rows" not in runtime_render or 'renderPagination("runtimes"' not in runtime_render:
        return fail("Runtimes discovery list must be paginated")
    for required in ["node-version", "python-version", "go-version", "install-maven", "install-gradle", "install_maven_latest", "install_gradle_latest"]:
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
    if "planFingerprint: state.mysqlPlan.planFingerprint" not in toolchain_events or "actionId: `mysql_${state.mysqlPlan.action}`" not in toolchain_events:
        return fail("MySQL repair must use backend plan actionId/riskLevel/fingerprint")

    print("Frontend data contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
