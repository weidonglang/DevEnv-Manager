from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tauri" / "src"

REQUIRED_FEATURES = [
    "dashboard",
    "runtimes",
    "environment",
    "projects",
    "ports",
    "fileAssociations",
    "cleanup",
    "toolchains",
    "profiles",
    "reports",
    "settings",
]

REQUIRED_FEATURE_FILES = ["index.ts", "api.ts", "render.ts", "events.ts", "state.ts", "types.ts"]

REQUIRED_CORE_FILES = [
    "invoke.ts",
    "risk.ts",
    "format.ts",
    "events.ts",
    "storage.ts",
    "validation.ts",
]

REQUIRED_UI_COMPONENTS = [
    "Button.ts",
    "Card.ts",
    "Dialog.ts",
    "Drawer.ts",
    "MessageBar.ts",
    "Toolbar.ts",
    "Toast.ts",
    "Searchbox.ts",
    "Tablist.ts",
    "Badge.ts",
    "EmptyState.ts",
    "Progress.ts",
    "RiskPanel.ts",
]


def fail(message: str) -> int:
    print(f"Frontend architecture check failed: {message}")
    return 1


def main() -> int:
    main_ts = SRC / "main.ts"
    if not main_ts.exists():
        return fail("tauri/src/main.ts is missing")
    main_lines = main_ts.read_text(encoding="utf-8").splitlines()
    if len(main_lines) > 500:
        return fail(f"tauri/src/main.ts has {len(main_lines)} lines; keep it under 500")

    for path in [SRC / "app", SRC / "core", SRC / "ui" / "components", SRC / "ui" / "theme"]:
        if not path.is_dir():
            return fail(f"missing directory {path.relative_to(ROOT).as_posix()}")

    for name in REQUIRED_CORE_FILES:
        if not (SRC / "core" / name).is_file():
            return fail(f"missing core file tauri/src/core/{name}")

    for name in REQUIRED_UI_COMPONENTS:
        if not (SRC / "ui" / "components" / name).is_file():
            return fail(f"missing UI component tauri/src/ui/components/{name}")

    for feature in REQUIRED_FEATURES:
        feature_dir = SRC / "features" / feature
        if not feature_dir.is_dir():
            return fail(f"missing feature directory tauri/src/features/{feature}")
        for name in REQUIRED_FEATURE_FILES:
            if not (feature_dir / name).is_file():
                return fail(f"missing feature file tauri/src/features/{feature}/{name}")

    direct_core_imports: list[str] = []
    scattered_token_calls: list[str] = []
    for path in SRC.rglob("*.ts"):
        rel = path.relative_to(ROOT).as_posix()
        if rel == "tauri/src/core/invoke.ts":
            continue
        text = path.read_text(encoding="utf-8")
        if '@tauri-apps/api/core' in text:
            direct_core_imports.append(rel)
        if rel != "tauri/src/core/risk.ts" and '"create_confirmation_token"' in text:
            scattered_token_calls.append(rel)
    if direct_core_imports:
        return fail("direct @tauri-apps/api/core imports outside core/invoke.ts: " + ", ".join(direct_core_imports))
    if scattered_token_calls:
        return fail("create_confirmation_token must be centralized in tauri/src/core/risk.ts: " + ", ".join(scattered_token_calls))

    print("Frontend architecture check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
