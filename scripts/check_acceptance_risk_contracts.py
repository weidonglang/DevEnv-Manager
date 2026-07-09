from __future__ import annotations

from acceptance_common import feature_id, iter_features


HIGH_RISK_LEVELS = {"medium", "high", "critical", "readOnlyWritesReport"}


def main() -> int:
    errors: list[str] = []
    for _, feature in iter_features():
        fid = feature_id(feature)
        risk = str(feature.get("riskLevel", ""))
        commands = feature.get("backendCommands", [])
        if feature.get("requiresRiskPlan") and not risk:
            errors.append(f"{fid}: requiresRiskPlan=true but riskLevel is empty")
        if feature.get("requiresToken") and not feature.get("requiresRiskPlan"):
            errors.append(f"{fid}: requiresToken=true but requiresRiskPlan=false")
        if feature.get("requiresToken") and risk == "readOnly":
            errors.append(f"{fid}: readOnly feature should not require token")
        if risk in HIGH_RISK_LEVELS and commands and feature.get("status") not in {"backendOnly", "deferred", "manualOnly"}:
            checks = set(feature.get("acceptanceChecks", []))
            if feature.get("requiresRiskPlan") and "riskContract" not in checks:
                errors.append(f"{fid}: risk-bearing feature missing riskContract acceptance check")
        if feature.get("requiresRiskPlan") and feature.get("safeSmokeMode") == "readOnly":
            errors.append(f"{fid}: risk-plan feature cannot use readOnly safeSmokeMode")

    if errors:
        print("Acceptance risk contract check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Acceptance risk contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
