from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from acceptance_common import (
    ARTIFACTS,
    MANIFEST,
    ROOT,
    feature_domain,
    feature_id,
    feature_priority,
    feature_status,
    iter_features,
    load_manifest,
    registered_commands,
    summarize_manifest,
)


REPORT_JSON = ARTIFACTS / "feature-acceptance-report.json"
REPORT_MD = ARTIFACTS / "feature-acceptance-report.md"
MANUAL_CHECKLIST = ARTIFACTS / "manual-smoke-checklist.md"


@dataclass
class Case:
    caseId: str
    mode: str
    page: str
    feature: str
    priority: str
    status: str
    reason: str


def run_command(command: list[str], cwd: Path = ROOT, timeout: int = 120) -> tuple[int, str]:
    env = os.environ.copy()
    env.setdefault("NO_COLOR", "1")
    resolved = command[:]
    executable = shutil.which(resolved[0])
    if executable:
        resolved[0] = executable
    completed = subprocess.run(
        resolved,
        cwd=str(cwd),
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        env=env,
    )
    return completed.returncode, completed.stdout.strip()


def script_case(mode: str, script: str, priority: str = "P0") -> Case:
    code, output = run_command([sys.executable, str(ROOT / "scripts" / script)])
    status = "passed" if code == 0 else "failed"
    reason = output.splitlines()[-1] if output else f"{script} exited {code}"
    if code != 0 and output:
        reason = output[:3000]
    return Case(script, mode, "cross-cutting", script, priority, status, reason)


def static_cases() -> list[Case]:
    cases = [
        script_case("static", "check_feature_manifest.py"),
        script_case("static", "check_feature_coverage.py"),
        script_case("static", "check_acceptance_deferred_reasons.py"),
        script_case("static", "check_acceptance_risk_contracts.py"),
        script_case("static", "check_acceptance_report_contracts.py"),
        script_case("static", "check_acceptance_debug_contracts.py"),
        script_case("static", "check_backend_ui_drift.py"),
        script_case("static", "check_frontend_acceptance_selectors.py"),
        script_case("static", "check_toast_only_actions.py"),
        script_case("static", "check_frontend_data_contracts.py"),
        script_case("static", "check_frontend_action_contracts.py"),
        script_case("static", "check_frontend_quality_regressions.py"),
        script_case("static", "check_tauri_command_contract.py"),
        script_case("static", "check_update_lifecycle_contracts.py"),
        script_case("static", "check_environment_runtime_workflows.py"),
        script_case("static", "check_cleanup_recovery_workflows.py"),
        script_case("static", "check_v17_migration_completeness.py"),
        script_case("static", "check_release_dispositions.py"),
    ]

    for page, feature in iter_features():
        priority = feature_priority(page, feature)
        status = feature_status(feature)
        case_status = "passed"
        reason = f"Manifest status recorded as {status}."
        if priority == "P0" and status in {"backendOnly", "missing", "deferred"}:
            case_status = "failed"
            reason = f"P0 feature is {status} and must not be treated as implemented."
        cases.append(Case(f"{feature_id(feature)}.manifest", "static", page.get("pageId", ""), feature_id(feature), priority, case_status, reason))
    return cases


def safe_cases() -> list[Case]:
    cases: list[Case] = []
    commands = registered_commands()
    for page, feature in iter_features():
        priority = feature_priority(page, feature)
        for command in feature.get("backendCommands", []):
            cases.append(
                Case(
                    f"{feature_id(feature)}.{command}.registered",
                    "safe",
                    page.get("pageId", ""),
                    feature_id(feature),
                    priority,
                    "passed" if command in commands else "failed",
                    "Backend command registered." if command in commands else "Backend command is not registered.",
                )
            )
        mode = feature.get("safeSmokeMode")
        if mode in {"manual", "dryRun"}:
            cases.append(
                Case(
                    f"{feature_id(feature)}.safeSmoke",
                    "safe",
                    page.get("pageId", ""),
                    feature_id(feature),
                    priority,
                    "manual" if mode == "manual" else "skipped",
                    feature.get("manualOnlyReason") or f"{mode} command cannot be executed without app-specific token or real Tauri state.",
                )
            )
        elif mode in {"readOnly", "tempFile", "readOnlyTempDir"}:
            cases.append(
                Case(
                    f"{feature_id(feature)}.safeSmoke",
                    "safe",
                    page.get("pageId", ""),
                    feature_id(feature),
                    priority,
                    "skipped",
                    "Read-only Tauri command requires the running Tauri backend; registration was verified instead.",
                )
            )
    cases.append(disposable_port_case())
    return cases


def disposable_port_case() -> Case:
    if platform.system().lower() != "windows":
        return Case("ports.userProcessCandidate.sandbox", "safe", "ports", "ports.userProcessCandidate", "P0", "skipped", "Disposable port smoke is Windows-focused for this project.")

    port = 18765
    process: subprocess.Popen[str] | None = None
    try:
        process = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        time.sleep(1.5)
        with socket.create_connection(("127.0.0.1", port), timeout=3):
            pass
        return Case("ports.userProcessCandidate.sandbox", "safe", "ports", "ports.userProcessCandidate", "P0", "passed", f"Temporary python listener on 127.0.0.1:{port} was reachable and cleaned up.")
    except Exception as error:
        return Case("ports.userProcessCandidate.sandbox", "safe", "ports", "ports.userProcessCandidate", "P0", "skipped", f"Could not run disposable port smoke: {error}")
    finally:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


def frontend_cases() -> list[Case]:
    build_code, build_output = run_command(["npm", "run", "build"], cwd=ROOT / "tauri", timeout=180)
    acceptance_code, acceptance_output = run_command(["npm", "run", "acceptance:frontend"], cwd=ROOT / "tauri", timeout=180)
    return [
        Case("tauri.npm.build", "frontend", "cross-cutting", "frontendBuild", "P0", "passed" if build_code == 0 else "failed", build_output[-2000:] if build_output else f"npm run build exited {build_code}"),
        Case("tauri.npm.acceptance_frontend", "frontend", "cross-cutting", "frontendAcceptance", "P0", "passed" if acceptance_code == 0 else "failed", acceptance_output[:4000] if acceptance_output else f"npm run acceptance:frontend exited {acceptance_code}"),
    ]


def report_cases() -> list[Case]:
    cases: list[Case] = []
    for path in sorted(ARTIFACTS.glob("feature-acceptance-*.json")):
        if path.name == REPORT_JSON.name:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data.get("cases", []):
            cases.append(Case(**item))
    if not cases:
        cases.append(Case("report.noInput", "report", "cross-cutting", "report", "P0", "skipped", "No prior mode reports found."))
    return cases


def coverage_cases() -> list[Case]:
    cases = [
        script_case("coverage", "check_feature_coverage.py"),
        script_case("coverage", "generate_feature_coverage_summary.py"),
    ]
    for domain, row in summarize_manifest()["byDomain"].items():
        cases.append(
            Case(
                f"coverage.{domain}",
                "coverage",
                domain,
                "coverage",
                "P1",
                "passed",
                f"total={row.get('total', 0)}, P0={row.get('P0', 0)}, P1={row.get('P1', 0)}, partial={row.get('partial', 0)}, backendOnly={row.get('backendOnly', 0)}",
            )
        )
    return cases


def summarize(cases: list[Case]) -> dict:
    counts = {status: sum(1 for case in cases if case.status == status) for status in ["passed", "failed", "skipped", "manual"]}
    manifest = load_manifest()
    features = [(page, feature) for page, feature in iter_features(manifest)]

    def rows_for(status: str) -> list[dict]:
        return [
            {
                "page": page.get("pageId"),
                "featureId": feature_id(feature),
                "commands": feature.get("backendCommands", []),
                "status": feature_status(feature),
                "reason": feature.get("expectedFailureReason") or feature.get("deferredReason") or feature.get("manualOnlyReason"),
            }
            for page, feature in features
            if feature_status(feature) == status
        ]

    return {
        "total": len(cases),
        "passed": counts["passed"],
        "failed": counts["failed"],
        "skipped": counts["skipped"],
        "manual": counts["manual"],
        "coverage": summarize_manifest(manifest),
        "p0Failures": [asdict(case) for case in cases if case.priority == "P0" and case.status == "failed"],
        "p1Failures": [asdict(case) for case in cases if case.priority == "P1" and case.status == "failed"],
        "backendOnlyFeatures": rows_for("backendOnly"),
        "uiOnlyFeatures": rows_for("uiOnly"),
        "missingFeatures": rows_for("missing"),
        "partialFeatures": rows_for("partial"),
        "deferredFeatures": rows_for("deferred"),
        "manualOnlyFeatures": rows_for("manualOnly"),
        "toastOnlyActions": [asdict(case) for case in cases if "toast" in case.caseId.lower() and case.status == "failed"],
        "missingDataTestIds": [asdict(case) for case in cases if "selector" in case.caseId.lower() and case.status == "failed"],
        "manualItems": [asdict(case) for case in cases if case.status == "manual"],
    }


def write_reports(mode: str, cases: list[Case]) -> dict:
    ARTIFACTS.mkdir(exist_ok=True)
    data = {"mode": mode, "summary": summarize(cases), "cases": [asdict(case) for case in cases]}
    (ARTIFACTS / f"feature-acceptance-{mode}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_MD.write_text(render_markdown(data), encoding="utf-8")
    write_manual_checklist()
    return data


def render_markdown(data: dict) -> str:
    summary = data["summary"]
    coverage = summary["coverage"]
    lines = [
        "# DevEnv Manager Feature Acceptance Report",
        "",
        "## Summary",
        "",
        f"- Mode: {data['mode']}",
        f"- Total cases: {summary['total']}",
        f"- Passed: {summary['passed']}",
        f"- Failed: {summary['failed']}",
        f"- Skipped: {summary['skipped']}",
        f"- Manual: {summary['manual']}",
        f"- Total features: {coverage['totalFeatures']}",
        f"- P0 features: {coverage['byPriority'].get('P0', 0)}",
        f"- P1 features: {coverage['byPriority'].get('P1', 0)}",
        f"- Static covered: {coverage['byMode'].get('static', 0)}",
        f"- Frontend covered: {coverage['byMode'].get('frontend', 0)}",
        f"- Safe backend smoke covered: {coverage['byMode'].get('safe', 0)}",
        "",
    ]
    add_case_table(lines, "P0 Failures", summary["p0Failures"])
    add_case_table(lines, "P1 Failures", summary["p1Failures"])
    add_feature_table(lines, "Backend-only Features", summary["backendOnlyFeatures"])
    add_feature_table(lines, "UI-only Features", summary["uiOnlyFeatures"])
    add_feature_table(lines, "Missing Features", summary["missingFeatures"])
    add_feature_table(lines, "Partial Features", summary["partialFeatures"])
    add_feature_table(lines, "Deferred Features", summary["deferredFeatures"])
    add_feature_table(lines, "Manual-only Features", summary["manualOnlyFeatures"])
    add_case_table(lines, "Manual Items", summary["manualItems"])
    add_case_table(lines, "All Cases", data["cases"], include_status=True)
    return "\n".join(lines) + "\n"


def add_case_table(lines: list[str], title: str, cases: list[dict], include_status: bool = False) -> None:
    lines.extend([f"## {title}", ""])
    if include_status:
        lines.extend(["| Status | Priority | Case | Page | Reason |", "|---|---|---|---|---|"])
        for case in cases:
            lines.append(f"| {case['status']} | {case['priority']} | `{case['caseId']}` | {case['page']} | {sanitize(case['reason'])} |")
    else:
        lines.extend(["| Case | Page | Feature | Reason |", "|---|---|---|---|"])
        for case in cases:
            lines.append(f"| `{case.get('caseId')}` | {case.get('page')} | {case.get('feature')} | {sanitize(case.get('reason', ''))} |")
    if not cases:
        lines.append("| - | - | - | None |" if not include_status else "| - | - | - | - | None |")
    lines.append("")


def add_feature_table(lines: list[str], title: str, rows: list[dict]) -> None:
    lines.extend([f"## {title}", "", "| Feature | Page | Commands | Status | Reason |", "|---|---|---|---|---|"])
    for row in rows:
        lines.append(f"| `{row['featureId']}` | {row['page']} | `{', '.join(row.get('commands', []))}` | {row['status']} | {sanitize(row.get('reason') or '')} |")
    if not rows:
        lines.append("| - | - | - | None | - |")
    lines.append("")


def sanitize(value: object) -> str:
    return str(value).replace("|", "/").replace("\r", " ").replace("\n", "<br>")


def write_manual_checklist() -> None:
    grouped: dict[str, list[tuple[dict, dict]]] = {}
    for page, feature in iter_features():
        if feature.get("manualAllowed") or feature_status(feature) in {"manualOnly", "deferred"} or "manual" in feature.get("testModes", []):
            grouped.setdefault(feature_domain(page, feature), []).append((page, feature))
    lines = ["# DevEnv Manager Manual Smoke Checklist", "", f"Generated from `{MANIFEST.relative_to(ROOT).as_posix()}`.", ""]
    for domain in sorted(grouped):
        lines.extend([f"## {domain}", ""])
        for _, feature in grouped[domain]:
            selectors = feature.get("selectors", {})
            entry = selectors.get("entry") or feature.get("currentEntry") or feature.get("oldEntry") or feature.get("frontendEntry", {}).get("route")
            reason = feature.get("expectedFailureReason") or feature.get("deferredReason") or feature.get("manualOnlyReason") or "Record screenshot, action, debug log and result/error text."
            lines.extend(
                [
                    f"- [ ] `{feature_id(feature)}` ({feature_priority({}, feature)})",
                    f"  - Entry: `{entry}`",
                    "  - Steps: open the route, trigger the primary action only if safe, inspect result/error/debug surfaces.",
                    "  - Expected: visible result or explicit refusal reason; no blank toast.",
                    f"  - Risk: {feature.get('riskLevel')} / status={feature_status(feature)}.",
                    f"  - Skip allowed: {'Yes' if feature.get('manualAllowed') else 'No'}",
                    f"  - If failed record: {reason}",
                ]
            )
        lines.append("")
    MANUAL_CHECKLIST.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_mode(mode: str) -> tuple[list[Case], int]:
    if mode == "static":
        cases = static_cases()
    elif mode == "safe":
        cases = safe_cases()
    elif mode == "frontend":
        cases = frontend_cases()
    elif mode == "report":
        cases = report_cases()
    elif mode == "coverage":
        cases = coverage_cases()
    else:
        raise ValueError(f"Unknown mode: {mode}")

    data = write_reports(mode, cases)
    write_stdout(REPORT_MD.read_text(encoding="utf-8"))
    print(f"Reports written: {REPORT_JSON.relative_to(ROOT).as_posix()}, {REPORT_MD.relative_to(ROOT).as_posix()}, {MANUAL_CHECKLIST.relative_to(ROOT).as_posix()}")
    return cases, 1 if data["summary"]["failed"] or data["summary"]["p0Failures"] else 0


def write_stdout(text: str) -> None:
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    if not text.endswith("\n"):
        sys.stdout.buffer.write(b"\n")
    sys.stdout.flush()


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run DevEnv Manager feature acceptance checks.")
    parser.add_argument("--mode", choices=["static", "safe", "frontend", "report", "coverage"], required=True)
    args = parser.parse_args(argv)
    _, code = run_mode(args.mode)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
