from __future__ import annotations

from pathlib import Path

from acceptance_common import ARTIFACTS, feature_domain, feature_id, feature_priority, feature_status, iter_features, load_manifest

CHECKLIST = ARTIFACTS / "manual-smoke-checklist.md"


def main() -> int:
    ARTIFACTS.mkdir(exist_ok=True)
    manifest = load_manifest()
    grouped: dict[str, list[tuple[dict, dict]]] = {}
    for page, feature in iter_features(manifest):
        if feature.get("manualAllowed") or feature_status(feature) in {"manualOnly", "deferred"} or "manual" in feature.get("testModes", []):
            grouped.setdefault(feature_domain(page, feature), []).append((page, feature))

    lines = [
        "# DevEnv Manager Manual Smoke Checklist",
        "",
        "Generated from `acceptance/feature-manifest.v1.8.2.json`.",
        "",
    ]
    for domain in sorted(grouped):
        lines.extend([f"## {domain}", ""])
        for _, feature in grouped[domain]:
            selectors = feature.get("selectors", {})
            entry = selectors.get("entry") or feature.get("currentEntry") or feature.get("oldEntry") or feature.get("frontendEntry", {}).get("route")
            expected = "Visible page result/error state matches manifest status and no blank toast appears."
            risk = f"Risk level: {feature.get('riskLevel')}; status: {feature_status(feature)}."
            skip = "Yes" if feature.get("manualAllowed") else "No"
            failure_record = feature.get("expectedFailureReason") or feature.get("deferredReason") or feature.get("manualOnlyReason") or "Record screenshot, action, debug log and result/error text."
            lines.extend(
                [
                    f"- [ ] `{feature_id(feature)}` ({feature_priority({}, feature)})",
                    f"  - Entry: `{entry}`",
                    "  - Steps: open the route, trigger the primary action if safe, inspect result/error/debug surfaces.",
                    f"  - Expected: {expected}",
                    f"  - Risk: {risk}",
                    f"  - Skip allowed: {skip}",
                    f"  - If failed record: {failure_record}",
                ]
            )
        lines.append("")
    CHECKLIST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Manual smoke checklist written: {CHECKLIST.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
