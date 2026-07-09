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
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
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


def load_manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def iter_features(manifest: dict):
    for page in manifest.get("pages", []):
        for feature in page.get("features", []):
            yield page, feature


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


def script_case(mode: str, script: str) -> Case:
    code, output = run_command([sys.executable, str(ROOT / "scripts" / script)])
    status = "passed" if code == 0 else "failed"
    reason = output.splitlines()[-1] if output else f"{script} exited {code}"
    if code != 0 and output:
        reason = output[:2000]
    return Case(script, mode, "cross-cutting", script, "P0", status, reason)


def static_cases() -> list[Case]:
    cases = [
        script_case("static", "check_feature_manifest.py"),
        script_case("static", "check_backend_ui_drift.py"),
        script_case("static", "check_frontend_acceptance_selectors.py"),
        script_case("static", "check_toast_only_actions.py"),
        script_case("static", "check_frontend_data_contracts.py"),
        script_case("static", "check_frontend_action_contracts.py"),
        script_case("static", "check_frontend_quality_regressions.py"),
        script_case("static", "check_tauri_command_contract.py"),
    ]

    manifest = load_manifest()
    for page, feature in iter_features(manifest):
        priority = feature.get("priority") or page.get("priority", "P2")
        status = feature.get("status")
        if priority == "P0" and status == "backendOnly":
            cases.append(
                Case(
                    f"{feature['featureId']}.status",
                    "static",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "failed",
                    "P0 feature is backendOnly and must not be treated as implemented.",
                )
            )
        elif priority == "P0" and status in {"missing", "deferred"}:
            cases.append(
                Case(
                    f"{feature['featureId']}.status",
                    "static",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "failed",
                    f"P0 feature status is {status}.",
                )
            )
        else:
            cases.append(
                Case(
                    f"{feature['featureId']}.manifest",
                    "static",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "passed",
                    f"Manifest status recorded as {status}.",
                )
            )
    return cases


def safe_cases() -> list[Case]:
    cases: list[Case] = []
    manifest = load_manifest()
    registered = registered_commands()

    for page, feature in iter_features(manifest):
        priority = feature.get("priority") or page.get("priority", "P2")
        commands = feature.get("backendCommands", [])
        for command in commands:
            cases.append(
                Case(
                    f"{feature['featureId']}.{command}.registered",
                    "safe",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "passed" if command in registered else "failed",
                    "Backend command registered." if command in registered else "Backend command is not registered.",
                )
            )

        mode = feature.get("safeSmokeMode")
        if mode in {"manual", "dryRun"}:
            cases.append(
                Case(
                    f"{feature['featureId']}.safeSmoke",
                    "safe",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "manual" if mode == "manual" else "skipped",
                    feature.get("manualOnlyReason") or f"{mode} command cannot be executed without app-specific token or real Tauri state.",
                )
            )
        elif mode in {"readOnly", "tempFile", "readOnlyTempDir"}:
            cases.append(
                Case(
                    f"{feature['featureId']}.safeSmoke",
                    "safe",
                    page.get("pageId", ""),
                    feature.get("featureId", ""),
                    priority,
                    "skipped",
                    "Read-only Tauri command requires the running Tauri backend; registration was verified instead.",
                )
            )

    cases.append(disposable_port_case())
    return cases


def registered_commands() -> set[str]:
    import re

    lib_rs = (ROOT / "tauri" / "src-tauri" / "src" / "lib.rs").read_text(encoding="utf-8")
    handler_re = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
    ident_re = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
    commands: set[str] = set()
    for match in handler_re.finditer(lib_rs):
        commands.update(ident_re.findall(match.group("body")))
    return commands


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
    except Exception as error:  # noqa: BLE001 - acceptance report should preserve environment failure
        return Case("ports.userProcessCandidate.sandbox", "safe", "ports", "ports.userProcessCandidate", "P0", "skipped", f"Could not run disposable port smoke: {error}")
    finally:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


def frontend_cases() -> list[Case]:
    cases: list[Case] = []
    build_code, build_output = run_command(["npm", "run", "build"], cwd=ROOT / "tauri", timeout=180)
    cases.append(
        Case(
            "tauri.npm.build",
            "frontend",
            "cross-cutting",
            "frontendBuild",
            "P0",
            "passed" if build_code == 0 else "failed",
            build_output[-2000:] if build_output else f"npm run build exited {build_code}",
        )
    )

    acceptance_code, acceptance_output = run_command(["npm", "run", "acceptance:frontend"], cwd=ROOT / "tauri", timeout=180)
    cases.append(
        Case(
            "tauri.npm.acceptance_frontend",
            "frontend",
            "cross-cutting",
            "frontendAcceptance",
            "P0",
            "passed" if acceptance_code == 0 else "failed",
            acceptance_output[:3000] if acceptance_output else f"npm run acceptance:frontend exited {acceptance_code}",
        )
    )
    return cases


def report_cases() -> list[Case]:
    mode_files = sorted(ARTIFACTS.glob("feature-acceptance-*.json"))
    cases: list[Case] = []
    for path in mode_files:
        if path.name == REPORT_JSON.name:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data.get("cases", []):
            cases.append(Case(**item))
    if not cases and REPORT_JSON.exists():
        data = json.loads(REPORT_JSON.read_text(encoding="utf-8"))
        for item in data.get("cases", []):
            cases.append(Case(**item))
    if not cases:
        cases.append(Case("report.noInput", "report", "cross-cutting", "report", "P0", "skipped", "No prior mode reports found."))
    return cases


def summarize(cases: list[Case]) -> dict:
    counts = {status: sum(1 for case in cases if case.status == status) for status in ["passed", "failed", "skipped", "manual"]}
    backend_only = []
    ui_only = []
    manifest = load_manifest()
    for page, feature in iter_features(manifest):
        row = {
            "page": page.get("pageId"),
            "featureId": feature.get("featureId"),
            "commands": feature.get("backendCommands", []),
            "status": feature.get("status"),
        }
        if feature.get("status") == "backendOnly":
            backend_only.append(row)
        if feature.get("status") == "uiOnly":
            ui_only.append(row)

    return {
        "total": len(cases),
        "passed": counts["passed"],
        "failed": counts["failed"],
        "skipped": counts["skipped"],
        "manual": counts["manual"],
        "p0Failures": [asdict(case) for case in cases if case.priority == "P0" and case.status == "failed"],
        "p1Failures": [asdict(case) for case in cases if case.priority == "P1" and case.status == "failed"],
        "backendOnlyFeatures": backend_only,
        "uiOnlyFeatures": ui_only,
        "toastOnlyActions": [asdict(case) for case in cases if "toast" in case.caseId.lower() and case.status == "failed"],
        "missingDataTestIds": [asdict(case) for case in cases if "selector" in case.caseId.lower() and case.status == "failed"],
        "manualItems": [asdict(case) for case in cases if case.status == "manual"],
    }


def write_reports(mode: str, cases: list[Case]) -> dict:
    ARTIFACTS.mkdir(exist_ok=True)
    data = {
        "mode": mode,
        "summary": summarize(cases),
        "cases": [asdict(case) for case in cases],
    }
    (ARTIFACTS / f"feature-acceptance-{mode}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_MD.write_text(render_markdown(data), encoding="utf-8")
    write_manual_checklist(data)
    return data


def render_markdown(data: dict) -> str:
    summary = data["summary"]
    lines = [
        "# DevEnv Manager Feature Acceptance Report",
        "",
        "## Summary",
        "",
        f"- Mode: {data['mode']}",
        f"- Total: {summary['total']}",
        f"- Passed: {summary['passed']}",
        f"- Failed: {summary['failed']}",
        f"- Skipped: {summary['skipped']}",
        f"- Manual: {summary['manual']}",
        "",
        "## P0 Failures",
        "",
        "| Case | Page | Feature | Reason |",
        "|---|---|---|---|",
    ]
    for case in summary["p0Failures"]:
        lines.append(f"| `{case['caseId']}` | {case['page']} | {case['feature']} | {case['reason'].replace('|', '/')} |")
    if not summary["p0Failures"]:
        lines.append("| - | - | - | None |")

    lines.extend(["", "## Backend-only Features", "", "| Feature | Page | Commands | Status |", "|---|---|---|---|"])
    for item in summary["backendOnlyFeatures"]:
        lines.append(f"| `{item['featureId']}` | {item['page']} | `{', '.join(item['commands'])}` | {item['status']} |")
    if not summary["backendOnlyFeatures"]:
        lines.append("| - | - | - | None |")

    lines.extend(["", "## UI-only Features", "", "| Feature | Page | Status |", "|---|---|---|"])
    for item in summary["uiOnlyFeatures"]:
        lines.append(f"| `{item['featureId']}` | {item['page']} | {item['status']} |")
    if not summary["uiOnlyFeatures"]:
        lines.append("| - | - | None |")

    lines.extend(["", "## Manual Items", "", "| Case | Reason |", "|---|---|"])
    for item in summary["manualItems"]:
        lines.append(f"| `{item['caseId']}` | {item['reason'].replace('|', '/')} |")
    if not summary["manualItems"]:
        lines.append("| - | None |")

    lines.extend(["", "## All Cases", "", "| Status | Priority | Case | Page | Reason |", "|---|---|---|---|---|"])
    for case in data["cases"]:
        lines.append(f"| {case['status']} | {case['priority']} | `{case['caseId']}` | {case['page']} | {case['reason'].replace('|', '/')} |")
    return "\n".join(lines) + "\n"


def write_manual_checklist(data: dict) -> None:
    manual = data["summary"]["manualItems"]
    lines = [
        "# DevEnv Manager Manual Smoke Checklist",
        "",
        "Generated by `scripts/run_feature_acceptance.py`.",
        "",
        "1. [ ] Runtime 页面最大化窗口是否好看，安装分组是否清楚。",
        "2. [ ] Ports 页面是否能看到行级可关闭原因。",
        "3. [ ] Cleanup 页面是否能看到磁盘概览、重复大文件、桌面归档、下载归档入口。",
        "4. [ ] File Associations 是否能快速搜索 `.txt`、`.md`、`.json`。",
        "5. [ ] D / HC 模式下说明卡、表格和按钮是否可读。",
        "6. [ ] 是否还有空白 toast 或只有 toast 没有页面结果。",
    ]
    if manual:
        lines.extend(["", "## Cases Marked Manual", ""])
        for case in manual:
            lines.append(f"- [ ] `{case['caseId']}`: {case['reason']}")
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
    else:
        raise ValueError(f"Unknown mode: {mode}")

    data = write_reports(mode, cases)
    failed = data["summary"]["failed"]
    p0_failed = len(data["summary"]["p0Failures"])
    write_stdout(REPORT_MD.read_text(encoding="utf-8"))
    print(f"Reports written: {REPORT_JSON.relative_to(ROOT).as_posix()}, {REPORT_MD.relative_to(ROOT).as_posix()}, {MANUAL_CHECKLIST.relative_to(ROOT).as_posix()}")
    return cases, 1 if failed or p0_failed else 0


def write_stdout(text: str) -> None:
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    if not text.endswith("\n"):
        sys.stdout.buffer.write(b"\n")
    sys.stdout.flush()


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run DevEnv Manager feature acceptance checks.")
    parser.add_argument("--mode", choices=["static", "safe", "frontend", "report"], required=True)
    args = parser.parse_args(argv)
    _, code = run_mode(args.mode)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
