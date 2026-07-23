from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
BACKEND_DISPOSITIONS = ROOT / "acceptance" / "backend-command-disposition.v1.8.2.json"
TAURI_SRC = ROOT / "tauri" / "src"
RUST_SRC = ROOT / "tauri" / "src-tauri" / "src"

INVOKE_RE = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
DYNAMIC_COMMAND_RE = re.compile(r"\b(?:installRuntime|installWithRisk|installSelectedWithRisk|installLatestWithRisk)\s*\([^)]*[\"'`](install_[A-Za-z0-9_]+)[\"'`]", re.DOTALL)
VARIABLE_INVOKE_RE = re.compile(
    r"\bconst\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?P<value>[^;]+);"
    r"(?P<tail>.{0,400}?)\binvoke(?:<[^>]+>)?\s*\(\s*(?P=name)\b",
    re.DOTALL,
)
STRING_COMMAND_RE = re.compile(r"[\"'`]([a-z][a-z0-9_]+)[\"'`]")
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
        for match in VARIABLE_INVOKE_RE.finditer(text):
            commands.update(STRING_COMMAND_RE.findall(match.group("value")))
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


def backend_dispositions() -> dict[str, dict]:
    data = json.loads(read(BACKEND_DISPOSITIONS))
    return {item["command"]: item for item in data.get("commands", []) if item.get("command")}


def explained_backend_only(command: str, invokes: set[str], dispositions: dict[str, dict]) -> tuple[bool, str]:
    item = dispositions.get(command)
    if not item:
        return False, "missing backend command disposition"
    reason = str(item.get("exactReason") or "").strip()
    if not reason:
        return False, "backend command disposition has no exact reason"
    classification = item.get("classification")
    if classification in {"internal-helper", "bootstrap", "diagnostic"}:
        return True, f"{classification}: {reason}"
    replacements = item.get("replacementChain") or []
    if classification in {"compatibility-alias", "replacement-command"} and replacements:
        exposed = sorted(command for command in replacements if command in invokes)
        if exposed:
            return True, f"{classification}: replaced by {', '.join(exposed)}"
        return False, f"replacement chain is not exposed by frontend: {', '.join(replacements)}"
    if classification == "dynamic-user-command" and item.get("dynamicWrapper"):
        return True, f"dynamic-user-command: {reason}"
    return False, f"unexplained {classification or 'unknown'} command: {reason}"


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
    dispositions = backend_dispositions()

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
    explained: list[str] = []
    for command in backend_only:
        accepted, reason = explained_backend_only(command, invokes, dispositions)
        if accepted:
            explained.append(f"{command} ({reason})")
        else:
            errors.append(f"unexplained backend-only command: {command} ({reason})")

    manifest_uncovered = sorted((registered - declared) - set(allowed))
    unexplained_manifest = []
    for command in manifest_uncovered:
        item = dispositions.get(command)
        if not item or not str(item.get("exactReason") or "").strip():
            unexplained_manifest.append(command)
    if unexplained_manifest:
        errors.append("registered commands lack manifest coverage and disposition reason: " + ", ".join(unexplained_manifest))

    for warning in warnings:
        print("WARNING:", warning)

    if explained:
        print(f"Explained backend-only commands: {len(explained)}")

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
