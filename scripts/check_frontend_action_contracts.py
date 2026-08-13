from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tauri" / "src"

CRITICAL_IDS = {
    "run-doctor",
    "repair-doctor-safe",
    "scan-ports",
    "inspect-runtime-strong",
    "inspect-python-integrity",
    "preview-python-repair",
    "inspect-env-reliability",
    "create-java-stabilize-plan",
    "apply-env-repair-plan",
    "inspect-toolchains",
    "inspect-platforms",
    "run-learning-command",
    "inspect-maintenance",
    "scan-maintenance",
    "inspect-recycle-bin",
    "preview-cleanup-plan",
    "execute-cleanup-plan",
    "preview-desktop-archive",
    "preview-downloads-archive",
    "execute-move-plan",
    "inspect-system-platforms",
    "inspect-local-services",
    "run-network",
    "load-cache",
    "clear-cache",
    "run-command",
    "inspect-agent-traces",
    "check-updates",
    "check-project",
    "preview-project-config",
    "apply-project-config",
    "scan-file-associations",
    "create-file-assoc-plan",
    "apply-file-assoc-plan",
}

CRITICAL_DATA_ACTIONS = {
    "kill-port",
    "system-platform",
    "local-service-manage",
    "project-run",
    "switch-jdk",
    "uninstall-jdk",
    "switch-node",
    "uninstall-node",
    "switch-python",
    "uninstall-python",
    "switch-go",
    "uninstall-go",
    "switch-build-tool",
    "uninstall-build-tool",
    "apply-profile",
    "restore-profile-history",
}


def fail(errors: list[str]) -> int:
    print("Frontend action contract check failed.")
    for error in errors:
        print(f"- {error}")
    return 1


def main() -> int:
    source = "\n".join(path.read_text(encoding="utf-8") for path in SRC.rglob("*.ts"))
    errors: list[str] = []
    for element_id in sorted(CRITICAL_IDS):
        marker = f'#{element_id}'
        if element_id not in source:
            errors.append(f"critical action is not rendered: {element_id}")
        elif marker not in source:
            errors.append(f"critical action has no stable event binding: {element_id}")
    for action in sorted(CRITICAL_DATA_ACTIONS):
        if f'data-action="{action}"' not in source:
            errors.append(f"delegated action is not rendered: {action}")
        if f'action === "{action}"' not in source:
            errors.append(f"delegated action has no handler: {action}")
    if 'button[data-pick-directory]' not in source or "pickDirectoryInto" not in source:
        errors.append("directory picker buttons are not bound through the shared picker handler")
    if errors:
        return fail(errors)
    print(
        "Frontend action contract check passed "
        f"({len(CRITICAL_IDS)} critical ids, {len(CRITICAL_DATA_ACTIONS)} delegated actions)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
