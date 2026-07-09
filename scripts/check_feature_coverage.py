from __future__ import annotations

from acceptance_common import feature_priority, feature_status, iter_features, summarize_manifest


MIN_TOTAL_FEATURES = 20
REQUIRED_MODES = {"static", "frontend", "safe"}


def main() -> int:
    summary = summarize_manifest()
    errors: list[str] = []
    if summary["totalFeatures"] < MIN_TOTAL_FEATURES:
        errors.append(f"manifest has only {summary['totalFeatures']} features; expected at least {MIN_TOTAL_FEATURES}")

    modes = set(summary["byMode"])
    missing_modes = sorted(REQUIRED_MODES - modes)
    if missing_modes:
        errors.append("manifest missing test mode coverage: " + ", ".join(missing_modes))

    p0_count = int(summary["byPriority"].get("P0", 0))
    p1_count = int(summary["byPriority"].get("P1", 0))
    if p0_count == 0:
        errors.append("manifest has no P0 features")
    if p1_count == 0:
        errors.append("manifest has no P1 features")

    for page, feature in iter_features():
        priority = feature_priority(page, feature)
        status = feature_status(feature)
        modes = set(feature.get("testModes", []))
        if priority in {"P0", "P1"} and "static" not in modes:
            errors.append(f"{feature.get('featureId')}: P0/P1 feature must include static test mode")
        if status not in {"manualOnly", "deferred"} and priority == "P0" and "frontend" not in modes:
            errors.append(f"{feature.get('featureId')}: P0 non-manual feature must include frontend test mode")

    if errors:
        print("Feature coverage check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print(
        "Feature coverage check passed "
        f"({summary['totalFeatures']} features, P0={p0_count}, P1={p1_count})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
