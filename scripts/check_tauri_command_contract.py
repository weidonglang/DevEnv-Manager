from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "tauri" / "src"
RUST = ROOT / "tauri" / "src-tauri" / "src"
MANIFEST = ROOT / "acceptance" / "feature-manifest.v2.0.json"
ALLOWLIST = ROOT / "acceptance" / "backend-command-allowlist.json"

INVOKE_RE = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
COMMAND_RE = re.compile(
    r"#\s*\[\s*tauri::command\s*\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*\(",
    re.MULTILINE,
)
HANDLER_RE = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
IDENT_RE = re.compile(r"\b[a-z][a-z0-9_]*\b")
DIRECT_POWERSHELL_RE = re.compile(
    r'(?:hidden_command|Command::new)\s*\(\s*[\"\'](?:powershell|powershell\.exe|pwsh|pwsh\.exe)[\"\']'
)

FORBIDDEN = {
    "configure_user_environment": "旧环境写入命令绕过预览和回执",
    "create_junction_bridge": "旧 Junction 命令会直接执行",
    "create_confirmation_token": "v1.7 基座不暴露确认令牌工作流",
}

REQUIRED = {
    "create_move_plan",
    "execute_move_plan",
    "release_user_port",
    "run_feature_acceptance_suite",
    "search_file_association_app",
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def fail(errors: list[str]) -> int:
    print("Tauri command contract check failed.")
    for error in errors:
        print(f"- {error}")
    return 1


def main() -> int:
    rust_files = sorted(RUST.rglob("*.rs"))
    frontend_source = "\n".join(read(path) for path in FRONTEND.rglob("*.ts"))
    rust_source = "\n".join(read(path) for path in rust_files)
    lib_source = read(RUST / "lib.rs")
    handler_match = HANDLER_RE.search(lib_source)
    if not handler_match:
        return fail(["tauri::generate_handler! registration was not found"])

    invokes = set(INVOKE_RE.findall(frontend_source))
    definitions = set(COMMAND_RE.findall(rust_source))
    handlers = set(IDENT_RE.findall(handler_match.group("body")))
    manifest = json.loads(read(MANIFEST))
    manifest_commands = {
        command
        for page in manifest["pages"]
        for feature in page["features"]
        for command in feature["backendCommands"]
    }
    allowlist = json.loads(read(ALLOWLIST))
    errors: list[str] = []

    for command, reason in allowlist.items():
        if not isinstance(reason, str) or not reason.strip():
            errors.append(f"backend allowlist command {command} lacks a reason")

    for command in sorted(invokes - handlers):
        errors.append(f"frontend invoke is not registered: {command}")
    for command in sorted(definitions - handlers):
        errors.append(f"Tauri command is defined but not registered: {command}")
    for command in sorted(handlers - definitions):
        errors.append(f"registered handler has no #[tauri::command] definition: {command}")
    for command in sorted(REQUIRED - handlers):
        errors.append(f"required command is missing: {command}")
    for command, reason in FORBIDDEN.items():
        if command in handlers:
            errors.append(f"forbidden command is registered: {command} ({reason})")

    backend_only = handlers - invokes - manifest_commands
    for command in sorted(backend_only - set(allowlist)):
        errors.append(f"backend-only command lacks an allowlist reason: {command}")
    for command in sorted(set(allowlist) - backend_only):
        errors.append(f"stale backend-only allowlist entry: {command}")

    for path in rust_files:
        if path.name == "powershell_runner.rs":
            continue
        if DIRECT_POWERSHELL_RE.search(read(path)):
            errors.append(
                f"direct PowerShell invocation outside powershell_runner.rs: {path.relative_to(ROOT).as_posix()}"
            )

    for forbidden in ("confirmationToken", "riskOperationToken", "create_confirmation_token"):
        if forbidden in frontend_source:
            errors.append(f"frontend exposes forbidden token workflow marker: {forbidden}")

    broadcast_call = "powershell_runner::broadcast_environment_change()"
    for path in (RUST / "lib.rs", RUST / "env_core" / "mod.rs"):
        if broadcast_call not in read(path):
            errors.append(
                f"environment broadcast does not use bounded PowerShell runner: {path.relative_to(ROOT).as_posix()}"
            )

    if errors:
        return fail(errors)
    print(
        "Tauri command contract check passed "
        f"({len(invokes)} frontend invokes, {len(handlers)} registered commands, "
        f"{len(backend_only)} explained backend-only commands)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
