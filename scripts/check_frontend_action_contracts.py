from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "tauri" / "src" / "features"

ACTION_RE = re.compile(r"""renderActionButton\(\s*["']([^"']+)["']|data-action=["']([^"']+)["']""")
BIND_RE = re.compile(r"""bindAction\([^,]+,\s*["']([^"']+)["']""")

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


def main() -> int:
    missing: list[str] = []
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

    if missing:
        return fail("visible actions without bindAction handlers:\n- " + "\n- ".join(missing))

    print("Frontend action contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
