from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TAURI_SRC = ROOT / "tauri" / "src"
RUST_SRC = ROOT / "tauri" / "src-tauri" / "src"

INVOKE_RE = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
COMMAND_RE = re.compile(
    r"#\s*\[\s*tauri::command\s*\]\s*(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*\(",
    re.MULTILINE,
)
HANDLER_RE = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
IDENT_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
REGISTRY_COMMAND_RE = re.compile(r'command:\s*"([A-Za-z0-9_]+)"')
REGISTRY_SPEC_RE = re.compile(r"RiskOperationSpec\s*\{(?P<body>.*?)\},", re.DOTALL)
DIRECT_POWERSHELL_RE = re.compile(
    r'(?:hidden_command|Command::new)\s*\(\s*["\'](?:powershell|powershell\.exe|pwsh|pwsh\.exe)["\']'
)

REQUIRED_FILE_ASSOC_COMMANDS = {
    "scan_file_associations",
    "create_file_association_plan",
    "apply_file_association_plan",
    "list_file_association_backups",
    "rollback_file_association_backup",
    "open_file_association_backup_dir",
    "open_default_apps_settings",
    "open_file_type_settings",
    "export_file_association_report",
    "search_file_association_app",
}

FORBIDDEN_REGISTERED_COMMANDS = {
    "configure_user_environment": "legacy environment writer must not be exposed without the preview/apply token flow",
    "create_junction_bridge": "legacy junction command executes immediately; expose create_junction_bridge_plan + execute_move_plan instead",
}

REQUIRED_TOKEN_GATED_COMMANDS = {
    "restore_environment_backup",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def ts_files() -> list[Path]:
    return sorted(TAURI_SRC.rglob("*.ts"))


def rust_files() -> list[Path]:
    return sorted(RUST_SRC.rglob("*.rs"))


def frontend_invokes() -> set[str]:
    commands: set[str] = set()
    for path in ts_files():
        commands.update(INVOKE_RE.findall(read_text(path)))
    return commands


def rust_command_defs() -> set[str]:
    commands: set[str] = set()
    for path in rust_files():
        commands.update(COMMAND_RE.findall(read_text(path)))
    return commands


def registered_handlers() -> set[str]:
    lib_rs = read_text(RUST_SRC / "lib.rs")
    handlers: set[str] = set()
    for match in HANDLER_RE.finditer(lib_rs):
        handlers.update(IDENT_RE.findall(match.group("body")))
    return handlers


def risk_registry_commands() -> set[str]:
    return set(risk_registry_entries())


def risk_registry_entries() -> dict[str, bool]:
    entries: dict[str, bool] = {}
    for match in REGISTRY_SPEC_RE.finditer(read_text(RUST_SRC / "lib.rs")):
        body = match.group("body")
        command = REGISTRY_COMMAND_RE.search(body)
        if not command:
            continue
        entries[command.group(1)] = bool(re.search(r"\brequires_token:\s*true\b", body))
    return entries


def command_body(command: str) -> str:
    lib_rs = read_text(RUST_SRC / "lib.rs")
    match = re.search(
        rf"#\s*\[\s*tauri::command\s*\]\s*(?:async\s+)?fn\s+{re.escape(command)}\s*\([^)]*\).*?(?=\n#\s*\[\s*tauri::command\s*\]|\npub fn run\(|\Z)",
        lib_rs,
        re.DOTALL,
    )
    return match.group(0) if match else ""


def main() -> int:
    errors: list[str] = []
    invokes = frontend_invokes()
    command_defs = rust_command_defs()
    handlers = registered_handlers()
    registry_entries = risk_registry_entries()
    registry = set(registry_entries)

    missing_handlers = sorted(invokes - handlers)
    if missing_handlers:
        errors.append("Frontend invokes are not registered in Tauri generate_handler:")
        errors.extend(f"  - {name}" for name in missing_handlers)

    unregistered_defs = sorted(command_defs - handlers)
    if unregistered_defs:
        errors.append("Tauri command functions are defined but not registered:")
        errors.extend(f"  - {name}" for name in unregistered_defs)

    missing_file_assoc = sorted(REQUIRED_FILE_ASSOC_COMMANDS - handlers)
    if missing_file_assoc:
        errors.append("File association command surface is incomplete:")
        errors.extend(f"  - {name}" for name in missing_file_assoc)

    for command, reason in sorted(FORBIDDEN_REGISTERED_COMMANDS.items()):
        if command in handlers:
            errors.append(f"Forbidden registered command {command}: {reason}")

    token_gated_commands = set(REQUIRED_TOKEN_GATED_COMMANDS)
    token_gated_commands.update(
        command for command, requires_token in registry_entries.items() if requires_token
    )
    for command in sorted(token_gated_commands):
        if command in handlers:
            body = command_body(command)
            if "require_risk_operation_token" not in body and "require_confirmation_token" not in body:
                errors.append(f"Token-required command {command} is registered without a backend token gate")
            if command not in registry:
                errors.append(f"Token-required command {command} is missing from risk operation registry")

    for path in rust_files():
        relative = path.relative_to(ROOT).as_posix()
        if relative.endswith("powershell_runner.rs"):
            continue
        text = read_text(path)
        if DIRECT_POWERSHELL_RE.search(text):
            errors.append(f"Direct PowerShell invocation is forbidden outside powershell_runner.rs: {relative}")

    if errors:
        print("Tauri command contract check failed.")
        for error in errors:
            print(error)
        return 1

    print(
        "Tauri command contract check passed "
        f"({len(invokes)} frontend invokes, {len(handlers)} registered commands)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
