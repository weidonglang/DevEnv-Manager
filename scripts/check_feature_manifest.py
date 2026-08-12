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
    for forbidden in ("create_confirmation_token", "confirmationToken", "riskOperationToken"):
        if forbidden in frontend_source:
            fail(f"v1.7 frontend must not expose token workflow: {forbidden}")

    print(
        "feature manifest passed "
        f"({len(page_ids)} pages, {len(feature_ids)} features, "
        f"{selector_count} selectors, {len(manifest_commands)} commands, "
        f"{len(invokes)} frontend invokes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
