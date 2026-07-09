from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
ARTIFACTS = ROOT / "artifacts"
TAURI_SRC = ROOT / "tauri" / "src"
RUST_SRC = ROOT / "tauri" / "src-tauri" / "src"

STATUSES = {"implemented", "partial", "backendOnly", "uiOnly", "missing", "deferred", "manualOnly"}
PRIORITIES = {"P0", "P1", "P2"}


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def iter_features(manifest: dict[str, Any] | None = None):
    data = manifest or load_manifest()
    for page in data.get("pages", []):
        for feature in page.get("features", []):
            yield page, feature


def feature_id(feature: dict[str, Any]) -> str:
    return str(feature.get("featureId") or feature.get("id") or "<missing-feature-id>")


def feature_priority(page: dict[str, Any], feature: dict[str, Any]) -> str:
    return str(feature.get("priority") or page.get("priority") or "P2")


def feature_status(feature: dict[str, Any]) -> str:
    return str(feature.get("status") or "missing")


def feature_domain(page: dict[str, Any], feature: dict[str, Any]) -> str:
    return str(feature.get("domain") or page.get("displayName") or page.get("pageId") or "unknown")


def selector_values(feature: dict[str, Any]) -> list[str]:
    values: list[str] = []
    entry = feature.get("frontendEntry")
    if isinstance(entry, dict):
        values.extend(str(item) for item in entry.get("testIds", []) if item)
    selectors = feature.get("selectors")
    if isinstance(selectors, dict):
        values.extend(str(value) for value in selectors.values() if value)
    return sorted(set(values))


def frontend_invokes() -> set[str]:
    invoke_re = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
    dynamic_re = re.compile(r"\b(?:installRuntime|installWithRisk|installLatestWithRisk)\s*\([^)]*[\"'`](install_[A-Za-z0-9_]+)[\"'`]", re.DOTALL)
    commands: set[str] = set()
    for path in TAURI_SRC.rglob("*.ts"):
        text = path.read_text(encoding="utf-8")
        commands.update(invoke_re.findall(text))
        commands.update(dynamic_re.findall(text))
    return commands


def registered_commands() -> set[str]:
    lib_rs = (RUST_SRC / "lib.rs").read_text(encoding="utf-8")
    handler_re = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
    ident_re = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
    commands: set[str] = set()
    for match in handler_re.finditer(lib_rs):
        commands.update(ident_re.findall(match.group("body")))
    return commands


def manifest_commands(manifest: dict[str, Any] | None = None) -> set[str]:
    commands: set[str] = set()
    for _, feature in iter_features(manifest):
        commands.update(str(command) for command in feature.get("backendCommands", []) if command)
    return commands


def summarize_manifest(manifest: dict[str, Any] | None = None) -> dict[str, Any]:
    data = manifest or load_manifest()
    features = [(page, feature) for page, feature in iter_features(data)]
    by_priority = Counter(feature_priority(page, feature) for page, feature in features)
    by_status = Counter(feature_status(feature) for _, feature in features)
    by_domain: dict[str, Counter[str]] = defaultdict(Counter)
    modes = Counter()
    for page, feature in features:
        domain = feature_domain(page, feature)
        by_domain[domain]["total"] += 1
        by_domain[domain][feature_priority(page, feature)] += 1
        by_domain[domain][feature_status(feature)] += 1
        for mode in feature.get("testModes", []):
            modes[str(mode)] += 1
    return {
        "totalFeatures": len(features),
        "byPriority": dict(by_priority),
        "byStatus": dict(by_status),
        "byDomain": {domain: dict(counter) for domain, counter in sorted(by_domain.items())},
        "byMode": dict(modes),
        "backendOnly": [feature_id(feature) for _, feature in features if feature_status(feature) == "backendOnly"],
        "uiOnly": [feature_id(feature) for _, feature in features if feature_status(feature) == "uiOnly"],
        "missing": [feature_id(feature) for _, feature in features if feature_status(feature) == "missing"],
        "deferred": [feature_id(feature) for _, feature in features if feature_status(feature) == "deferred"],
        "manualOnly": [feature_id(feature) for _, feature in features if feature_status(feature) == "manualOnly"],
        "partial": [feature_id(feature) for _, feature in features if feature_status(feature) == "partial"],
    }
