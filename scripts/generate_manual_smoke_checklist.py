#!/usr/bin/env python3
"""Regenerate the minimal manual checklist from the latest acceptance report."""

import json

from run_feature_acceptance import REPORT_JSON, write_reports


def main() -> int:
    if not REPORT_JSON.exists():
        raise SystemExit(
            "acceptance report is missing; run run_feature_acceptance.py --mode safe first"
        )
    suite = json.loads(REPORT_JSON.read_text(encoding="utf-8"))
    write_reports(suite)
    print("manual smoke checklist generated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
