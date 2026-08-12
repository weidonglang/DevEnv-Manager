#!/usr/bin/env python3
"""Validate the in-app feature acceptance contract without third-party packages."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v2.0.json"
SCHEMA = ROOT / "acceptance" / "acceptance-schema.json"
BACKEND = ROOT / "tauri" / "src-tauri" / "src" / "lib.rs"
FRONTEND_ROOT = ROOT / "tauri" / "src"
VALID_STATUSES = {
    "implemented",
    "partial",
    "backendOnly",
    "uiOnly",
    "missing",
    "deferred",
    "manualOnly",
}
VALID_PRIORITIES = {"P0", "P1", "P2"}
BLOCKING_STATUSES = {"partial", "backendOnly", "uiOnly", "missing"}
ACCEPTANCE_COMMANDS = {
    "list_feature_acceptance_cases",
    "run_feature_acceptance_case",
    "run_feature_acceptance_suite",
    "export_feature_acceptance_report",
}
MANAGED_RUNTIME_INSTALLERS = ("jdk", "node", "python", "go", "maven", "gradle")
RUNTIME_DISCOVERY_GROUPS = (
    "Java / JDK",
    "Python",
    "Node.js",
    "Go",
    "Maven",
    "Gradle",
    "Rust / Cargo / rustup",
    ".NET SDK",
)
RUST_PROVIDER_ACTIONS = (
    "rust_install_toolchain",
    "rust_set_default_toolchain",
    "rust_update_toolchain",
    "rust_uninstall_toolchain",
)
DOTNET_PROVIDER_ACTIONS = (
    "dotnet_install_sdk",
    "dotnet_update_sdk",
    "dotnet_uninstall_sdk",
)


def fail(message: str) -> None:
    raise SystemExit(message)


def registered_commands(source: str) -> set[str]:
    try:
        handler = source.split("tauri::generate_handler![", 1)[1].split("]", 1)[0]
    except IndexError:
        fail("cannot find tauri::generate_handler command registry")
    return set(re.findall(r"\b([a-z][a-z0-9_]*)\b", handler))


def frontend_invokes(source: str) -> set[str]:
    return set(
        re.findall(r'\binvoke(?:<[^;()]+?>)?\(\s*["\']([a-z][a-z0-9_]*)["\']', source)
    )


def function_body(source: str, function_name: str) -> str:
    markers = (f"fn {function_name}(", f"function {function_name}(")
    starts = [source.find(marker) for marker in markers]
    start = min((index for index in starts if index >= 0), default=-1)
    if start < 0:
        fail(f"required function is missing: {function_name}")
    body_start = source.find("{", start)
    if body_start < 0:
        fail(f"cannot parse function body: {function_name}")
    depth = 0
    for index in range(body_start, len(source)):
        character = source[index]
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return source[body_start + 1:index]
    fail(f"unterminated function body: {function_name}")
    return ""


def main() -> int:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        fail("feature manifest schemaVersion must be 1")
    if not manifest.get("productVersion"):
        fail("feature manifest productVersion is required")
    if schema.get("additionalProperties") is not False:
        fail("acceptance schema must reject unknown root properties")

    backend_source = BACKEND.read_text(encoding="utf-8")
    registered = registered_commands(backend_source)
    frontend_files = list(FRONTEND_ROOT.rglob("*.ts"))
    frontend_source = "\n".join(path.read_text(encoding="utf-8") for path in frontend_files)
    invokes = frontend_invokes(frontend_source)

    feature_ids: set[str] = set()
    case_ids: set[str] = set()
    page_ids: set[str] = set()
    manifest_commands: set[str] = set()
    selector_count = 0
    for page in manifest.get("pages", []):
        page_id = page.get("pageId", "")
        if not page_id or page_id in page_ids:
            fail(f"duplicate or missing pageId: {page_id!r}")
        page_ids.add(page_id)
        if not page.get("displayName") or not page.get("features"):
            fail(f"page {page_id} must have displayName and features")
        for feature in page["features"]:
            feature_id = feature.get("featureId", "")
            if not feature_id or feature_id in feature_ids:
                fail(f"duplicate or missing featureId: {feature_id!r}")
            feature_ids.add(feature_id)
            status = feature.get("status")
            priority = feature.get("priority")
            if status not in VALID_STATUSES:
                fail(f"invalid status for {feature_id}: {status!r}")
            if priority not in VALID_PRIORITIES:
                fail(f"invalid priority for {feature_id}: {priority!r}")
            if priority == "P0" and status in BLOCKING_STATUSES:
                fail(f"P0 feature is not implemented: {feature_id} ({status})")
            mode = feature.get("safeSmokeMode")
            case_id = f"{feature_id}.{mode}"
            if case_id in case_ids:
                fail(f"duplicate acceptance case: {case_id}")
            case_ids.add(case_id)
            if mode == "manual" and not feature.get("manualOnlyReason"):
                fail(f"manual feature lacks reason: {feature_id}")
            entry = feature.get("frontendEntry") or {}
            view_id = entry.get("viewId", "")
            selectors = entry.get("selectors") or []
            if not view_id or f'id="{view_id}"' not in frontend_source:
                fail(f"frontend view not found for {feature_id}: {view_id!r}")
            if priority in {"P0", "P1"} and not selectors:
                fail(f"critical feature lacks selectors: {feature_id}")
            for selector in selectors:
                if not selector.startswith("#"):
                    fail(f"selector must be a stable id for {feature_id}: {selector}")
                if selector[1:] not in frontend_source:
                    fail(f"selector is not present in frontend source for {feature_id}: {selector}")
                selector_count += 1
            commands = feature.get("backendCommands") or []
            if not commands:
                fail(f"feature lacks backend command coverage: {feature_id}")
            for command in commands:
                if command not in registered:
                    fail(f"manifest command is not registered: {feature_id} -> {command}")
                manifest_commands.add(command)

    missing_acceptance_commands = sorted(ACCEPTANCE_COMMANDS - registered)
    if missing_acceptance_commands:
        fail(f"acceptance commands are not registered: {missing_acceptance_commands}")
    frontend_only = sorted(invokes - registered)
    if frontend_only:
        fail(f"frontend invokes missing backend registration: {frontend_only}")
    declared_views = set(re.findall(r'id="(view-[a-z-]+)"', frontend_source))
    referenced_views = set(re.findall(r'#(view-[a-z-]+)', frontend_source))
    missing_views = sorted(referenced_views - declared_views)
    if missing_views:
        fail(f"frontend references unknown view ids: {missing_views}")
    for forbidden in ("create_confirmation_token", "confirmationToken", "riskOperationToken"):
        if forbidden in frontend_source:
            fail(f"v1.7 frontend must not expose token workflow: {forbidden}")
    for runtime in MANAGED_RUNTIME_INSTALLERS:
        body = function_body(backend_source, f"install_{runtime}_blocking")
        if "switch_runtime_blocking" in body or "refresh_user_java_home" in body:
            fail(f"managed {runtime} install must not switch the active runtime")
    migration_source = (FRONTEND_ROOT / "p0Migration.ts").read_text(encoding="utf-8")
    missing_runtime_groups = [
        group for group in RUNTIME_DISCOVERY_GROUPS if group not in migration_source
    ]
    if missing_runtime_groups:
        fail(f"runtime discovery groups are missing: {missing_runtime_groups}")
    missing_rust_actions = [
        action
        for action in RUST_PROVIDER_ACTIONS
        if action not in backend_source or action not in frontend_source
    ]
    if missing_rust_actions:
        fail(f"rustup provider actions are not fully wired: {missing_rust_actions}")
    missing_dotnet_actions = [
        action
        for action in DOTNET_PROVIDER_ACTIONS
        if action not in backend_source or action not in frontend_source
    ]
    if missing_dotnet_actions:
        fail(f"dotnet provider actions are not fully wired: {missing_dotnet_actions}")
    toolchain_action_body = function_body(frontend_source, "runToolchainAction")
    for required_result_marker in (
        "#toolchain-operation-result",
        "setMigrationResult",
        "loadToolchains",
        "focusResult",
    ):
        if required_result_marker not in toolchain_action_body:
            fail(
                "toolchain actions must keep a durable verified result: "
                f"missing {required_result_marker}"
            )

    print(
        "feature manifest passed "
        f"({len(page_ids)} pages, {len(feature_ids)} features, "
        f"{selector_count} selectors, {len(manifest_commands)} commands, "
        f"{len(invokes)} frontend invokes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
