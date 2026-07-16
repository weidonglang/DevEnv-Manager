from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
REQUIRED_PAGES = {
    "dashboard",
    "runtimes",
    "environment",
    "reports",
    "ports",
    "fileAssociations",
    "cleanup",
    "projects",
    "toolchains",
    "profiles",
    "learningCenter",
    "settings",
    "update",
    "advanced",
    "quality",
}
REQUIRED_DOMAINS = {
    "Workbench",
    "Runtime",
    "Environment",
    "DoctorReports",
    "Cleanup",
    "Ports",
    "Projects",
    "Toolchains",
    "FileAssociations",
    "Profiles",
    "LearningCenter",
    "Settings",
    "Update",
    "Debug",
    "Advanced",
    "GlobalQuality",
}
REQUIRED_FEATURE_FIELDS = {
    "featureId",
    "id",
    "domain",
    "userVisibleName",
    "name",
    "priority",
    "targetVersion",
    "status",
    "oldFeature",
    "frontendComponent",
    "frontendEntry",
    "selectors",
    "backendCommands",
    "backendExists",
    "frontendWired",
    "riskLevel",
    "requiresTauri",
    "requiresLoading",
    "requiresResultArea",
    "requiresErrorArea",
    "requiresDebug",
    "requiresReport",
    "requiresRiskPlan",
    "requiresToken",
    "requiresVerify",
    "requiresRollback",
    "requiresPagination",
    "requiresI18n",
    "requiresDarkReadable",
    "safeSmokeMode",
    "manualAllowed",
    "acceptanceChecks",
    "testModes",
}
VALID_STATUS = {
    "implemented",
    "partial",
    "backendOnly",
    "uiOnly",
    "missing",
    "deferred",
    "manualOnly",
}
VALID_PRIORITY = {"P0", "P1", "P2"}


def load_manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def iter_features(manifest: dict):
    for page in manifest.get("pages", []):
        for feature in page.get("features", []):
            yield page, feature


def validate_manifest() -> list[str]:
    errors: list[str] = []
    if not MANIFEST.exists():
        return [f"manifest missing: {MANIFEST.relative_to(ROOT).as_posix()}"]

    manifest = load_manifest()
    if manifest.get("version") != "1.8.2":
        errors.append("manifest version must be 1.8.2")

    pages = manifest.get("pages")
    if not isinstance(pages, list) or not pages:
        errors.append("manifest.pages must be a non-empty array")
        return errors

    page_ids = [page.get("pageId") for page in pages]
    missing_pages = sorted(REQUIRED_PAGES - set(page_ids))
    if missing_pages:
        errors.append("manifest is missing required pages: " + ", ".join(missing_pages))

    duplicate_pages = sorted({page_id for page_id in page_ids if page_ids.count(page_id) > 1})
    if duplicate_pages:
        errors.append("duplicate pageId values: " + ", ".join(duplicate_pages))

    feature_ids: list[str] = []
    domains: set[str] = set()
    for page, feature in iter_features(manifest):
        page_id = page.get("pageId", "<missing-page>")
        feature_id = feature.get("featureId")
        if not feature_id:
            errors.append(f"{page_id}: feature missing featureId")
            continue
        feature_ids.append(feature_id)
        domains.add(str(feature.get("domain", "")))

        missing_fields = sorted(REQUIRED_FEATURE_FIELDS - set(feature))
        if missing_fields:
            errors.append(f"{feature_id}: missing required fields: {', '.join(missing_fields)}")

        priority = feature.get("priority") or page.get("priority")
        status = feature.get("status")
        if priority not in VALID_PRIORITY:
            errors.append(f"{feature_id}: invalid priority {priority!r}")
        if status not in VALID_STATUS:
            errors.append(f"{feature_id}: invalid status {status!r}")

        entry = feature.get("frontendEntry")
        if not isinstance(entry, dict):
            errors.append(f"{feature_id}: frontendEntry must be an object")
            continue
        if not entry.get("route"):
            errors.append(f"{feature_id}: frontendEntry.route is required")
        test_ids = entry.get("testIds")
        if not isinstance(test_ids, list):
            errors.append(f"{feature_id}: frontendEntry.testIds must be an array")
        elif priority == "P0" and not test_ids:
            errors.append(f"{feature_id}: P0 feature must declare testIds")

        selectors = feature.get("selectors")
        if not isinstance(selectors, dict):
            errors.append(f"{feature_id}: selectors must be an object")
        elif priority in {"P0", "P1"}:
            if not selectors.get("entry"):
                errors.append(f"{feature_id}: P0/P1 feature must declare selectors.entry")
            if feature.get("requiresResultArea") and not selectors.get("result"):
                errors.append(f"{feature_id}: requiresResultArea=true but selectors.result is missing")
            if feature.get("requiresErrorArea") and not selectors.get("error"):
                errors.append(f"{feature_id}: requiresErrorArea=true but selectors.error is missing")

        commands = feature.get("backendCommands")
        if not isinstance(commands, list):
            errors.append(f"{feature_id}: backendCommands must be an array")
        elif priority == "P0" and not commands and status not in {"uiOnly", "missing", "deferred", "manualOnly"}:
            errors.append(f"{feature_id}: P0 feature must declare backendCommands unless uiOnly/missing/deferred/manualOnly")

        checks = feature.get("acceptanceChecks")
        if not isinstance(checks, list) or not checks:
            errors.append(f"{feature_id}: acceptanceChecks must be a non-empty array")

        if priority == "P0" and status in {"missing", "deferred"} and not feature.get("manualOnlyReason"):
            errors.append(f"{feature_id}: P0 {status} feature must include manualOnlyReason")
        if status == "deferred" and not feature.get("deferredReason"):
            errors.append(f"{feature_id}: deferred feature must include deferredReason")
        if status == "manualOnly" and not feature.get("manualOnlyReason"):
            errors.append(f"{feature_id}: manualOnly feature must include manualOnlyReason")
        if status == "backendOnly" and feature.get("frontendWired") is not False:
            errors.append(f"{feature_id}: backendOnly feature must set frontendWired=false")
        if feature.get("requiresRiskPlan") and not feature.get("riskLevel"):
            errors.append(f"{feature_id}: requiresRiskPlan=true requires riskLevel")
        if feature.get("requiresToken") and not feature.get("requiresRiskPlan"):
            errors.append(f"{feature_id}: requiresToken=true requires requiresRiskPlan=true")

    duplicate_features = sorted({feature_id for feature_id in feature_ids if feature_ids.count(feature_id) > 1})
    if duplicate_features:
        errors.append("duplicate featureId values: " + ", ".join(duplicate_features))

    missing_domains = sorted(REQUIRED_DOMAINS - domains)
    if missing_domains:
        errors.append("manifest is missing required domains: " + ", ".join(missing_domains))

    for item in manifest.get("commandAllowlist", []):
        if not item.get("command") or not item.get("reason"):
            errors.append("commandAllowlist entries require command and reason")

    return errors


def main() -> int:
    errors = validate_manifest()
    if errors:
        print("Feature manifest check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Feature manifest check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
