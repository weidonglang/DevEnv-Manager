from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
TAURI_SRC = ROOT / "tauri" / "src"
RUST_SRC = ROOT / "tauri" / "src-tauri" / "src"

INVOKE_RE = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
DYNAMIC_COMMAND_RE = re.compile(r"\b(?:installRuntime|installWithRisk|installLatestWithRisk)\s*\([^)]*[\"'`](install_[A-Za-z0-9_]+)[\"'`]", re.DOTALL)
HANDLER_RE = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
IDENT_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def frontend_invokes() -> set[str]:
    commands: set[str] = set()
    for path in TAURI_SRC.rglob("*.ts"):
        text = read(path)
        commands.update(INVOKE_RE.findall(text))
        commands.update(DYNAMIC_COMMAND_RE.findall(text))
    return commands


def registered_commands() -> set[str]:
    lib_rs = read(RUST_SRC / "lib.rs")
    commands: set[str] = set()
    for match in HANDLER_RE.finditer(lib_rs):
        commands.update(IDENT_RE.findall(match.group("body")))
    return commands


def manifest_data() -> dict:
    return json.loads(read(MANIFEST))


def manifest_commands(manifest: dict) -> set[str]:
    commands: set[str] = set()
    for page in manifest.get("pages", []):
        for feature in page.get("features", []):
            commands.update(feature.get("backendCommands", []))
    return commands


def allowlisted(manifest: dict) -> dict[str, str]:
    return {item["command"]: item["reason"] for item in manifest.get("commandAllowlist", []) if item.get("command") and item.get("reason")}


def p0_backend_only(manifest: dict, invokes: set[str]) -> list[tuple[str, str, str]]:
    failures: list[tuple[str, str, str]] = []
    for page in manifest.get("pages", []):
        for feature in page.get("features", []):
            priority = feature.get("priority") or page.get("priority")
            if priority != "P0":
                continue
            status = feature.get("status")
            for command in feature.get("backendCommands", []):
                if status == "backendOnly" or command not in invokes:
                    failures.append((feature.get("featureId", "<unknown>"), page.get("pageId", "<unknown>"), command))
    return failures


def main() -> int:
    manifest = manifest_data()
    invokes = frontend_invokes()
    registered = registered_commands()
    declared = manifest_commands(manifest)
    allowed = allowlisted(manifest)

    errors: list[str] = []
    warnings: list[str] = []

    frontend_only = sorted(invokes - registered)
    if frontend_only:
        errors.append("frontend-only invokes: " + ", ".join(frontend_only))

    manifest_missing = sorted((declared - registered) - set(allowed))
    if manifest_missing:
        errors.append("manifest declares commands not registered in Tauri: " + ", ".join(manifest_missing))

    for feature_id, page_id, command in p0_backend_only(manifest, invokes):
        errors.append(f"P0 backend-only/unexposed command: {feature_id} ({page_id}) -> {command}")

    backend_only = sorted((registered - invokes) - set(allowed))
    if backend_only:
        warnings.append("backend-only registered commands not used by frontend: " + ", ".join(backend_only[:60]))
        if len(backend_only) > 60:
            warnings.append(f"... {len(backend_only) - 60} more backend-only commands omitted")

    manifest_uncovered = sorted((registered - declared) - set(allowed))
    if manifest_uncovered:
        warnings.append("registered commands not covered by feature manifest: " + ", ".join(manifest_uncovered[:60]))
        if len(manifest_uncovered) > 60:
            warnings.append(f"... {len(manifest_uncovered) - 60} more uncovered commands omitted")

    for warning in warnings:
        print("WARNING:", warning)

    if errors:
        print("Backend/UI drift check failed.")
        for error in errors:
            print("-", error)
        return 1

    print(
        "Backend/UI drift check passed "
        f"({len(registered)} registered, {len(invokes)} frontend invokes, {len(declared)} manifest commands)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
