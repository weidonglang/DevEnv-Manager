from __future__ import annotations

from acceptance_common import feature_id, iter_features


REPORT_CHECKS = {"reportContract", "noReportNeeded"}


def main() -> int:
    errors: list[str] = []
    for _, feature in iter_features():
        fid = feature_id(feature)
        checks = set(feature.get("acceptanceChecks", []))
        if feature.get("requiresReport") and not (checks & REPORT_CHECKS):
            errors.append(f"{fid}: requiresReport=true but acceptanceChecks lacks reportContract/noReportNeeded")
        if feature.get("requiresVerify") and feature.get("requiresReport") and not feature.get("backendCommands") and "noReportNeeded" not in checks:
            errors.append(f"{fid}: verify/report feature has no backendCommands or explicit noReportNeeded")

    if errors:
        print("Acceptance report contract check failed.")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Acceptance report contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
