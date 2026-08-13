from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tauri" / "src"


def fail(errors: list[str]) -> int:
    print("Frontend quality regression check failed.")
    for error in errors:
        print(f"- {error}")
    return 1


def main() -> int:
    main = (SRC / "main.ts").read_text(encoding="utf-8")
    migration = (SRC / "p0Migration.ts").read_text(encoding="utf-8")
    migration_css = (SRC / "v2-migrations.css").read_text(encoding="utf-8")
    all_source = "\n".join(path.read_text(encoding="utf-8") for path in SRC.rglob("*.ts"))
    errors: list[str] = []

    for marker in ("[object Object]", "SystemTime {", "devenv.debug.entries"):
        if marker in all_source:
            errors.append(f"forbidden user-visible or quota-risk marker remains: {marker}")
    if re.search(r"showToast\(\s*(?:\"\"|'')\s*[,)]", main):
        errors.append("blank toast call remains")
    for marker in [
        'typeof message === "string" ? message.trim() : ""',
        "hideToast();",
        "showBaseToast(text, isError);",
    ]:
        if marker not in main:
            errors.append(f"blank toast suppression is incomplete: {marker}")

    durable_panels = [
        "doctor-operation-result",
        "environment-operation-result",
        "maintenance-operation-result",
        "toolbox-operation-result",
        "settings-operation-result",
        "port-operation-result",
        "runtime-migration-result",
        "toolchain-operation-result",
    ]
    for panel in durable_panels:
        if panel not in main + migration:
            errors.append(f"durable operation panel is missing: {panel}")
    for marker in [
        '"#doctor-operation-result"',
        '"#environment-operation-result"',
        '"#maintenance-operation-result"',
        '"#toolbox-operation-result"',
        '"#settings-operation-result"',
        '"#runtime-migration-result"',
    ]:
        if main.count(marker) < 2:
            errors.append(f"durable result panel is not used by action handlers: {marker}")

    for marker in [
        "color: var(--text, CanvasText);",
        "background: var(--surface-soft, Canvas);",
        "overflow-wrap: anywhere;",
        ".operation-result.error",
    ]:
        if marker not in migration_css:
            errors.append(f"operation feedback style is missing readable fallback: {marker}")

    if errors:
        return fail(errors)
    print("Frontend quality regression check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
