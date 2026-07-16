from __future__ import annotations

import subprocess
import sys

from check_tauri_command_contract import main as check_tauri_command_contract
from check_release_consistency import main as check_release_consistency
from check_frontend_architecture import main as check_frontend_architecture
from check_frontend_data_contracts import main as check_frontend_data_contracts
from check_frontend_action_contracts import main as check_frontend_action_contracts
from check_frontend_quality_regressions import main as check_frontend_quality_regressions
from check_feature_manifest import main as check_feature_manifest
from check_feature_coverage import main as check_feature_coverage
from check_acceptance_deferred_reasons import main as check_acceptance_deferred_reasons
from check_acceptance_risk_contracts import main as check_acceptance_risk_contracts
from check_acceptance_report_contracts import main as check_acceptance_report_contracts
from check_acceptance_debug_contracts import main as check_acceptance_debug_contracts
from check_backend_ui_drift import main as check_backend_ui_drift
from check_frontend_acceptance_selectors import main as check_frontend_acceptance_selectors
from check_toast_only_actions import main as check_toast_only_actions


BLOCKED_PARTS = {
    ".idea",
    "__pycache__",
    "build",
    "dist",
    "target",
    "node_modules",
}

BLOCKED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".toc",
}


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def is_blocked(path: str) -> bool:
    parts = set(path.split("/"))
    if parts & BLOCKED_PARTS:
        return True
    return any(path.lower().endswith(suffix) for suffix in BLOCKED_SUFFIXES)


def main() -> int:
    blocked = [path for path in tracked_files() if is_blocked(path)]
    if blocked:
        print("Repository hygiene check failed: generated/local files are tracked.")
        for path in blocked[:200]:
            print(f"- {path}")
        if len(blocked) > 200:
            print(f"... and {len(blocked) - 200} more")
        return 1
    acceptance_checks = [
        check_feature_manifest,
        check_feature_coverage,
        check_acceptance_deferred_reasons,
        check_acceptance_risk_contracts,
        check_acceptance_report_contracts,
        check_acceptance_debug_contracts,
        check_backend_ui_drift,
        check_frontend_acceptance_selectors,
        check_toast_only_actions,
    ]
    for check in acceptance_checks:
        result = check()
        if result != 0:
            return result
    contract_result = check_tauri_command_contract()
    if contract_result != 0:
        return contract_result
    frontend_result = check_frontend_architecture()
    if frontend_result != 0:
        return frontend_result
    frontend_contract_result = check_frontend_data_contracts()
    if frontend_contract_result != 0:
        return frontend_contract_result
    frontend_action_result = check_frontend_action_contracts()
    if frontend_action_result != 0:
        return frontend_action_result
    frontend_quality_result = check_frontend_quality_regressions()
    if frontend_quality_result != 0:
        return frontend_quality_result
    release_result = check_release_consistency()
    if release_result != 0:
        return release_result
    print("Repository hygiene check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
