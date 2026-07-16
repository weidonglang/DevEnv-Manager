from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SCOPED_FILES = [
    ROOT / "tauri" / "src" / "features" / "ports" / "render.ts",
    ROOT / "tauri" / "src" / "features" / "ports" / "events.ts",
    ROOT / "tauri" / "src" / "features" / "cleanup" / "render.ts",
    ROOT / "tauri" / "src" / "features" / "cleanup" / "events.ts",
    ROOT / "tauri" / "src" / "features" / "environment" / "events.ts",
    ROOT / "tauri" / "src" / "ui" / "components" / "riskUx.ts",
]

FORBIDDEN = [
    "[object Object]",
    "Execute port resolution plan",
    "Windows service owns this port",
    "taskkill failed",
    "PID 4 is protected",
]

REQUIRED_SNIPPETS = {
    ROOT / "tauri" / "src" / "features" / "environment" / "events.ts": [
        'state.errors.applyResult = t("toast.createRepairPlanFirst");',
    ],
    ROOT / "tauri" / "src" / "styles.css": [
        ".cleanup-summary {",
        "border: 1px solid var(--color-border);",
        "background: var(--color-surface-raised);",
        "color: var(--color-text);",
        ".cleanup-summary strong {",
    ],
}


def fail(message: str) -> int:
    print(f"Frontend quality regression check failed: {message}")
    return 1


def main() -> int:
    failures: list[str] = []
    for path in SCOPED_FILES:
        text = path.read_text(encoding="utf-8")
        for needle in FORBIDDEN:
            if needle in text:
                failures.append(f"{path.relative_to(ROOT).as_posix()} contains forbidden UI copy: {needle}")
    for path, snippets in REQUIRED_SNIPPETS.items():
        text = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in text:
                failures.append(
                    f"{path.relative_to(ROOT).as_posix()} is missing durable operation feedback: {snippet}"
                )
    if failures:
        return fail("\n- " + "\n- ".join(failures))
    print("Frontend quality regression check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
