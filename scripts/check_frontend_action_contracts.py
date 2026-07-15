from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "tauri" / "src" / "features"
RUST_COMMANDS = ROOT / "tauri" / "src-tauri" / "src" / "lib.rs"

ACTION_RE = re.compile(r"""renderActionButton\(\s*["']([^"']+)["']|data-action=["']([^"']+)["']""")
BIND_RE = re.compile(r"""bindAction\([^,]+,\s*["']([^"']+)["']""")
RISK_SPEC_RE = re.compile(
    r"RiskOperationSpec\s*\{\s*command:\s*\"([^\"]+)\",\s*action_id:\s*\"([^\"]+)\",\s*"
    r"risk_level:\s*\"([^\"]+)\",\s*requires_backup:\s*(true|false)",
    re.DOTALL,
)
LITERAL_COMMAND_RE = re.compile(r'\bcommand:\s*"([^"]+)"')
LITERAL_ACTION_ID_RE = re.compile(r'\bactionId:\s*"([^"]+)"')
LITERAL_RISK_RE = re.compile(r'\briskLevel:\s*"([^"]+)"')

GLOBAL_ACTIONS = {
    "retry-active-view",
    "retry-safety-gate",
    "hide-toast",
}


def fail(message: str) -> int:
    print(f"Frontend action contract check failed: {message}")
    return 1


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def literal_actions(text: str) -> set[str]:
    actions: set[str] = set()
    for match in ACTION_RE.finditer(text):
        action = match.group(1) or match.group(2)
        if action:
            actions.add(action)
    return actions


def bound_actions(text: str) -> set[str]:
    return {match.group(1) for match in BIND_RE.finditer(text)}


def object_literals_after(text: str, marker: str) -> list[str]:
    objects: list[str] = []
    cursor = 0
    while True:
        marker_index = text.find(marker, cursor)
        if marker_index < 0:
            return objects
        start = text.find("{", marker_index + len(marker))
        if start < 0:
            return objects
        depth = 0
        quote = ""
        escaped = False
        index = start
        while index < len(text):
            char = text[index]
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = ""
            elif char in {'"', "'", "`"}:
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    objects.append(text[start:index + 1])
                    cursor = index + 1
                    break
            index += 1
        else:
            return objects


def literal(pattern: re.Pattern[str], text: str) -> str | None:
    match = pattern.search(text)
    return match.group(1) if match else None


def main() -> int:
    missing: list[str] = []
    risk_contract_errors: list[str] = []
    risk_specs = {
        command: {
            "action_id": action_id,
            "risk_level": risk_level,
            "requires_backup": requires_backup == "true",
        }
        for command, action_id, risk_level, requires_backup in RISK_SPEC_RE.findall(read(RUST_COMMANDS))
    }
    for feature_dir in sorted(path for path in FEATURES.iterdir() if path.is_dir()):
        render_path = feature_dir / "render.ts"
        events_path = feature_dir / "events.ts"
        if not render_path.exists() or not events_path.exists():
            continue

        rendered = literal_actions(read(render_path)) - GLOBAL_ACTIONS
        bound = bound_actions(read(events_path))
        unbound = sorted(rendered - bound)
        if unbound:
            rel = render_path.relative_to(ROOT).as_posix()
            missing.append(f"{rel}: {', '.join(unbound)}")

        event_text = read(events_path)
        for operation in object_literals_after(event_text, "context.risk.run("):
            command = literal(LITERAL_COMMAND_RE, operation)
            risk_level = literal(LITERAL_RISK_RE, operation)
            if not command or not risk_level:
                continue
            spec = risk_specs.get(command)
            location = events_path.relative_to(ROOT).as_posix()
            if not spec:
                risk_contract_errors.append(f"{location}: {command} is missing from Rust risk registry")
                continue
            if risk_level != spec["risk_level"]:
                risk_contract_errors.append(
                    f"{location}: {command} riskLevel={risk_level} but Rust risk_level={spec['risk_level']}"
                )
            action_id = literal(LITERAL_ACTION_ID_RE, operation) or command
            if action_id != spec["action_id"]:
                risk_contract_errors.append(
                    f"{location}: {command} actionId={action_id} but Rust action_id={spec['action_id']}"
                )
            if spec["requires_backup"] and "backupReceipt:" not in operation:
                risk_contract_errors.append(
                    f"{location}: {command} requires a backup but the frontend token has no backupReceipt"
                )

    if missing:
        return fail("visible actions without bindAction handlers:\n- " + "\n- ".join(missing))
    if risk_contract_errors:
        return fail("frontend/Rust risk token drift:\n- " + "\n- ".join(risk_contract_errors))

    print("Frontend action contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
