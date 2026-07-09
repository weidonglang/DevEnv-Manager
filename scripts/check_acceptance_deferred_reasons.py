from __future__ import annotations

from acceptance_common import feature_id, feature_status, iter_features


def main() -> int:
    errors: list[str] = []
    for page, feature in iter_features():
        status = feature_status(feature)
        fid = feature_id(feature)
        if status == "deferred" and not feature.get("deferredReason"):
            errors.append(f"{fid}: deferred feature missing deferredReason")
        if status == "manualOnly" and not feature.get("manualOnlyReason"):
            errors.append(f"{fid}: manualOnly feature missing manualOnlyReason")
        if feature.get("manualAllowed") and "manual" not in feature.get("testModes", []):
            errors.append(f"{fid}: manualAllowed=true but testModes does not include manual")
        if feature.get("priority") in {"P0", "P1"} and status in {"missing", "deferred"} and not (feature.get("deferredReason") or feature.get("expectedFailureReason")):
            errors.append(f"{fid}: P0/P1 {status} feature missing explicit reason")

    if errors:
        print("Acceptance deferred/manual reason check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Acceptance deferred/manual reason check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
