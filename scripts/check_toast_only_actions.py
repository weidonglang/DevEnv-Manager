from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "tauri" / "src" / "features"

BIND_RE = re.compile(r"bindAction\([^,]+,\s*[\"']([^\"']+)[\"']\s*,\s*async\s*\(\)\s*=>\s*\{(?P<body>.*?)\n\s*\}\);", re.DOTALL)
STATE_WRITE_RE = re.compile(r"\bstate\.[A-Za-z0-9_]+\s*=")
RESULT_WORD_RE = re.compile(r"(Result|result|plan|Plan|receipt|Receipt|error|Error)")

P0_ACTION_PREFIXES = (
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


def main() -> int:
    failures: list[str] = []
    warnings: list[str] = []
    for path in sorted(FEATURES.rglob("events.ts")):
        text = path.read_text(encoding="utf-8")
        for match in BIND_RE.finditer(text):
            action = match.group(1)
            body = match.group("body")
            has_toast = "context.toast" in body or "showToast" in body or "progress.done" in body
            has_state_result = bool(STATE_WRITE_RE.search(body) and RESULT_WORD_RE.search(body))
            has_state_error = "state.errors" in body or "planError" in body or "scanError" in body
            if not has_toast or has_state_result or has_state_error:
                continue
            rel = path.relative_to(ROOT).as_posix()
            message = f"{rel}: {action} appears toast/progress-only"
            if action.startswith(P0_ACTION_PREFIXES):
                failures.append(message)
            else:
                warnings.append(message)

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
