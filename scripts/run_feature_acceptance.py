#!/usr/bin/env python3
"""Run the v2 feature acceptance gates and generate durable artifacts."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
REPORT_JSON = ARTIFACTS / "feature-acceptance-report.json"
REPORT_MARKDOWN = ARTIFACTS / "feature-acceptance-report.md"
MANUAL_CHECKLIST = ARTIFACTS / "manual-smoke-checklist.md"


def console_text(value: object, *, error: bool = False) -> None:
    stream = sys.stderr if error else sys.stdout
    encoding = stream.encoding or "utf-8"
    print(str(value).encode(encoding, errors="replace").decode(encoding), file=stream)


def run(command: list[str]) -> str:
    completed = subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode:
        detail = (completed.stdout + "\n" + completed.stderr).strip()
        raise RuntimeError(f"command failed ({completed.returncode}): {' '.join(command)}\n{detail}")
    return completed.stdout


def run_static() -> None:
    checks = []
    for script in (
        "check_feature_manifest.py",
        "check_v17_frontend_baseline.py",
        "check_v2_migration_manifest.py",
        "check_safety_wording.py",
        "check_repo_hygiene.py",
    ):
        output = run([sys.executable, str(ROOT / "scripts" / script)])
        checks.append({"check": script, "status": "passed", "output": output.strip()})
        if output.strip():
            console_text(output.strip())
    write_mode_result("static", checks)


def run_frontend() -> None:
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    run([npm, "run", "build", "--prefix", "tauri"])
    console_text("frontend production build passed")
    output = run([sys.executable, str(ROOT / "scripts" / "check_feature_manifest.py")])
    if output.strip():
        console_text(output.strip())
    write_mode_result(
        "frontend",
        [
            {"check": "frontend-production-build", "status": "passed"},
            {"check": "feature-manifest", "status": "passed", "output": output.strip()},
        ],
    )


def run_safe() -> dict:
    output = run(
        [
            "cargo",
            "run",
            "--quiet",
            "--manifest-path",
            "tauri/src-tauri/Cargo.toml",
            "--bin",
            "devenv",
            "--",
            "acceptance",
            "--json",
        ]
    )
    suite = json.loads(output)
    write_reports(suite)
    if suite.get("failed"):
        failures = [
            f"{item['caseId']}: {item['reason']}"
            for item in suite.get("results", [])
            if item.get("status") == "failed"
        ]
        raise RuntimeError("safe acceptance failures:\n" + "\n".join(failures))
    console_text(summary(suite))
    return suite


def summary(suite: dict) -> str:
    return (
        "feature acceptance passed "
        f"(total={suite.get('total', 0)}, passed={suite.get('passed', 0)}, "
        f"failed={suite.get('failed', 0)}, skipped={suite.get('skipped', 0)}, "
        f"manual={suite.get('manual', 0)})"
    )


def markdown_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ")[:500]


def write_reports(suite: dict) -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "screenshots").mkdir(exist_ok=True)
    REPORT_JSON.write_text(
        json.dumps(suite, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    lines = [
        "# DevEnv Manager Feature Acceptance Report",
        "",
        "## Summary",
        "",
        f"- Total: {suite.get('total', 0)}",
        f"- Passed: {suite.get('passed', 0)}",
        f"- Failed: {suite.get('failed', 0)}",
        f"- Skipped: {suite.get('skipped', 0)}",
        f"- Manual: {suite.get('manual', 0)}",
        "",
        "| Priority | Page | Case | Status | Reason |",
        "|---|---|---|---|---|",
    ]
    for item in suite.get("results", []):
        lines.append(
            "| "
            + " | ".join(
                markdown_cell(item.get(key, ""))
                for key in ("priority", "page", "caseId", "status", "reason")
            )
            + " |"
        )
    REPORT_MARKDOWN.write_text("\n".join(lines) + "\n", encoding="utf-8")

    manual = [item for item in suite.get("results", []) if item.get("status") == "manual"]
    checklist = [
        "# DevEnv Manager Manual Smoke Checklist",
        "",
        "自动验收完成后只需确认以下项目：",
        "",
        "- [ ] 工具箱中的验收中心在宽屏下完整显示，操作区没有挤压或大片无效空白。",
        "- [ ] 深色和高对比主题下，验收摘要、状态、失败原因和按钮文字清晰可读。",
        "- [ ] 应用内运行安全验收后，统计与本报告一致且失败项可展开查看。",
    ]
    for item in manual:
        checklist.append(
            f"- [ ] {item.get('caseId')}: {item.get('reason', '需要人工确认')}"
        )
    MANUAL_CHECKLIST.write_text("\n".join(checklist) + "\n", encoding="utf-8")


def write_mode_result(mode: str, checks: list[dict]) -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    target = ARTIFACTS / f"feature-acceptance-{mode}.json"
    target.write_text(
        json.dumps(
            {
                "mode": mode,
                "total": len(checks),
                "passed": sum(item.get("status") == "passed" for item in checks),
                "failed": sum(item.get("status") == "failed" for item in checks),
                "checks": checks,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("static", "safe", "frontend", "report"), required=True)
    args = parser.parse_args()
    if args.mode == "static":
        run_static()
    elif args.mode == "safe":
        run_safe()
    elif args.mode == "frontend":
        run_frontend()
    else:
        run_safe()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, json.JSONDecodeError) as error:
        console_text(f"feature acceptance failed: {error}", error=True)
        raise SystemExit(1)
