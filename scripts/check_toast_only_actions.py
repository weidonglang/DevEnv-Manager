from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "tauri" / "src" / "features"

BIND_MARKER_RE = re.compile(r"bindAction\([^,]+,\s*[\"']([^\"']+)[\"']\s*,")
STATE_FEEDBACK_RE = re.compile(
    r"\bstate\.(?:errors(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)|[A-Za-z0-9_]*(?:Error|Result|Message))\s*=",
    re.IGNORECASE,
)

P0_ACTION_PREFIXES = (
    "apply-",
    "create-",
    "execute-",
    "update-",
    "delete-",
    "import-",
    "rollback-",
    "save-",
    "rename-",
    "copy-",
    "create-cleanup-plan",
    "execute-cleanup-plan",
    "clear-download-cache",
    "clean-dev-cache",
    "create-port-plan",
    "execute-port-plan",
    "install-",
    "apply-association-plan",
    "rollback-association-backup",
)

ALLOWED_TRANSIENT_PREFIXES = ("choose-",)


def matching_delimiter(text: str, start: int, opening: str, closing: str) -> int | None:
    depth = 0
    quote = ""
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
            continue
        if char in {'"', "'", "`"}:
            quote = char
        elif char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                return index
    return None


def action_bodies(text: str) -> list[tuple[str, str]]:
    actions: list[tuple[str, str]] = []
    for marker in BIND_MARKER_RE.finditer(text):
        arrow = text.find("=>", marker.end())
        if arrow < 0:
            continue
        start = arrow + 2
        while start < len(text) and text[start].isspace():
            start += 1
        if start >= len(text) or text[start] != "{":
            continue
        end = matching_delimiter(text, start, "{", "}")
        if end is not None:
            actions.append((marker.group(1), text[start + 1:end]))
    return actions


def toast_early_exit_branches(body: str) -> list[str]:
    branches: list[str] = []
    for match in re.finditer(r"\bif\s*\(", body):
        condition_start = body.find("(", match.start())
        condition_end = matching_delimiter(body, condition_start, "(", ")")
        if condition_end is None:
            continue
        statement_start = condition_end + 1
        while statement_start < len(body) and body[statement_start].isspace():
            statement_start += 1
        if statement_start < len(body) and body[statement_start] == "{":
            statement_end = matching_delimiter(body, statement_start, "{", "}")
            if statement_end is None:
                continue
            branch = body[statement_start + 1:statement_end]
        else:
            statement_end = body.find(";", statement_start)
            if statement_end < 0:
                continue
            branch = body[statement_start:statement_end + 1]
        if "context.toast" in branch and "return" in branch:
            branches.append(branch)
    return branches


def has_durable_feedback(text: str) -> bool:
    state_write = bool(STATE_FEEDBACK_RE.search(text))
    rerender = "renderAndBind(" in text or ".innerHTML = render" in text
    return state_write and rerender


def main() -> int:
    failures: list[str] = []
    warnings: list[str] = []
    for path in sorted(FEATURES.rglob("events.ts")):
        text = path.read_text(encoding="utf-8")
        for action, body in action_bodies(text):
            if action.startswith(ALLOWED_TRANSIENT_PREFIXES):
                continue
            has_toast = "context.toast" in body or "showToast" in body or "progress.done" in body
            rel = path.relative_to(ROOT).as_posix()
            critical = action.startswith(P0_ACTION_PREFIXES)
            if has_toast and not has_durable_feedback(body):
                message = f"{rel}: {action} appears toast/progress-only"
                (failures if critical else warnings).append(message)
            for branch in toast_early_exit_branches(body):
                if has_durable_feedback(branch):
                    continue
                message = f"{rel}: {action} has a toast-only early-exit branch"
                (failures if critical else warnings).append(message)

    for warning in warnings:
        print("WARNING:", warning)

    if failures:
        print("Toast-only action check failed.")
        for failure in failures:
            print("-", failure)
        return 1

    print("Toast-only action check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
