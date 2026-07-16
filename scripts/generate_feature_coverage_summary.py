from __future__ import annotations

import json
from pathlib import Path

from acceptance_common import ARTIFACTS, feature_domain, feature_id, feature_priority, feature_status, iter_features, load_manifest, summarize_manifest


COVERAGE_MD = ARTIFACTS / "feature-coverage-summary.md"
BLOCKERS_MD = ARTIFACTS / "p0-p1-blockers.md"
SUMMARY_JSON = ARTIFACTS / "feature-coverage-summary.json"


def main() -> int:
    ARTIFACTS.mkdir(exist_ok=True)
    manifest = load_manifest()
    summary = summarize_manifest(manifest)
    SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    COVERAGE_MD.write_text(render_coverage(summary, manifest), encoding="utf-8")
    BLOCKERS_MD.write_text(render_blockers(manifest), encoding="utf-8")
    print(f"Feature coverage summary written: {COVERAGE_MD.relative_to(Path.cwd()) if COVERAGE_MD.is_relative_to(Path.cwd()) else COVERAGE_MD}")
    print(f"P0/P1 blockers written: {BLOCKERS_MD.relative_to(Path.cwd()) if BLOCKERS_MD.is_relative_to(Path.cwd()) else BLOCKERS_MD}")
    return 0


def render_coverage(summary: dict, manifest: dict) -> str:
    lines = [
        "# DevEnv Manager Feature Coverage Summary",
        "",
        "## Totals",
        "",
        f"- Total features: {summary['totalFeatures']}",
        f"- P0 features: {summary['byPriority'].get('P0', 0)}",
        f"- P1 features: {summary['byPriority'].get('P1', 0)}",
        f"- P2 features: {summary['byPriority'].get('P2', 0)}",
        f"- Static covered: {summary['byMode'].get('static', 0)}",
        f"- Frontend covered: {summary['byMode'].get('frontend', 0)}",
        f"- Safe backend smoke covered: {summary['byMode'].get('safe', 0)}",
        f"- Manual only: {len(summary['manualOnly'])}",
        f"- Backend-only: {len(summary['backendOnly'])}",
        f"- UI-only: {len(summary['uiOnly'])}",
        f"- Missing: {len(summary['missing'])}",
        f"- Partial: {len(summary['partial'])}",
        f"- Deferred: {len(summary['deferred'])}",
        "",
        "## Domain Coverage",
        "",
        "| Domain | Total | P0 | P1 | Implemented | Partial | Backend-only | UI-only | Missing | Deferred | Manual-only |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for domain, row in summary["byDomain"].items():
        lines.append(
            f"| {domain} | {row.get('total', 0)} | {row.get('P0', 0)} | {row.get('P1', 0)} | "
            f"{row.get('implemented', 0)} | {row.get('partial', 0)} | {row.get('backendOnly', 0)} | "
            f"{row.get('uiOnly', 0)} | {row.get('missing', 0)} | {row.get('deferred', 0)} | {row.get('manualOnly', 0)} |"
        )
    lines.extend(["", "## Feature Matrix", "", "| Priority | Status | Domain | Feature | Modes |", "|---|---|---|---|---|"])
    for page, feature in iter_features(manifest):
        lines.append(
            f"| {feature_priority(page, feature)} | {feature_status(feature)} | {feature_domain(page, feature)} | "
            f"`{feature_id(feature)}` | {', '.join(feature.get('testModes', []))} |"
        )
    return "\n".join(lines) + "\n"


def render_blockers(manifest: dict) -> str:
    lines = [
        "# DevEnv Manager P0/P1 Blockers",
        "",
        "## Failed Or Incomplete P0/P1",
        "",
        "| Priority | Status | Domain | Feature | Reason | Next step |",
        "|---|---|---|---|---|---|",
    ]
    blockers = []
    for page, feature in iter_features(manifest):
        priority = feature_priority(page, feature)
        status = feature_status(feature)
        if priority not in {"P0", "P1"}:
            continue
        if status in {"implemented"}:
            continue
        reason = feature.get("expectedFailureReason") or feature.get("deferredReason") or feature.get("manualOnlyReason") or f"status={status}"
        next_step = "Implement UI wiring and durable result/error/debug/report surfaces." if status in {"backendOnly", "missing", "partial"} else "Keep tracked with reason."
        blockers.append((priority, status, feature_domain(page, feature), feature_id(feature), reason, next_step))
    for row in blockers:
        lines.append("| " + " | ".join(str(item).replace("|", "/") for item in row) + " |")
    if not blockers:
        lines.append("| - | - | - | - | None | - |")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
