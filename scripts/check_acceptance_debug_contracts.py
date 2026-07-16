from __future__ import annotations

from acceptance_common import feature_id, iter_features


def main() -> int:
    errors: list[str] = []
    for _, feature in iter_features():
        fid = feature_id(feature)
        checks = set(feature.get("acceptanceChecks", []))
        if feature.get("requiresDebug") and "debugContract" not in checks and feature.get("status") not in {"backendOnly", "uiOnly", "manualOnly", "deferred"}:
            errors.append(f"{fid}: requiresDebug=true but acceptanceChecks lacks debugContract")
        if feature.get("requiresErrorArea"):
            selectors = feature.get("selectors", {})
            if not isinstance(selectors, dict) or not selectors.get("error"):
                errors.append(f"{fid}: requiresErrorArea=true but selectors.error is missing")

    if errors:
        print("Acceptance debug contract check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Acceptance debug contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
