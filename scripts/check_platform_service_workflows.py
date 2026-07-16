from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    events = read("tauri/src/features/toolchains/events.ts")
    render = read("tauri/src/features/toolchains/render.ts")
    api = read("tauri/src/features/toolchains/api.ts")
    backend = read("tauri/src-tauri/src/lib.rs")
    package = read("tauri/package.json")
    selection_fixture = read("tauri/scripts/service-selection-acceptance.mjs")
    failures: list[str] = []

    if "state.services[0]" in events:
        failures.append("service management still uses state.services[0]")

    required_invokes = {
        "open_docker_desktop",
        "manage_system_platform",
        "manage_local_service",
        "local_service_logs",
        "open_local_service_directory",
    }
    for command in sorted(required_invokes):
        if f'"{command}"' not in api:
            failures.append(f"frontend API does not invoke {command}")

    required_selectors = {
        "platform-docker-section",
        "platform-operation-preview",
        "platform-operation-result",
        "local-services-table",
        "local-service-selected-detail",
        "local-service-directory-result",
        "local-service-logs-result",
        "local-service-operation-preview",
        "local-service-operation-result",
    }
    for selector in sorted(required_selectors):
        if f'data-testid="{selector}"' not in render:
            failures.append(f"missing stable selector {selector}")

    for action in (
        "docker_install",
        "docker_update",
        "docker_shutdown",
        "wsl_install",
        "wsl_update",
        "wsl_install_distro",
        "wsl_start",
        "wsl_terminate",
        "wsl_set_default",
    ):
        if action not in render or f'"{action}"' not in backend:
            failures.append(f"platform action is not end-to-end allowlisted: {action}")

    for field in ("executable_path", "install_directory", "path_status", "log_path", "log_path_reason"):
        if field not in backend:
            failures.append(f"backend service evidence field is missing: {field}")

    if "path.is_file().then_some(path)" not in backend:
        failures.append("service log path is not guarded by an existing-file check")
    if "updateServicesAfterRefresh" not in events or "disappeared after refresh" not in events:
        failures.append("selection invalidation after refresh is not handled")
    if "inspectLocalServices();" not in events or "Post-execution verification" not in events:
        failures.append("service operation does not perform persistent post-verification")
    if "inspectSystemPlatforms();" not in events or "Post-execution inspection" not in events:
        failures.append("platform operation does not perform persistent post-verification")
    if "service-selection-acceptance.mjs" not in package:
        failures.append("frontend acceptance does not execute the service selection fixture")
    for scenario in ("first", "middle", "last", "disappeared", "changed", "inaccessible"):
        if scenario not in selection_fixture:
            failures.append(f"service selection fixture does not cover {scenario}")

    if failures:
        raise SystemExit("Platform/service workflow contracts failed:\n- " + "\n- ".join(failures))
    print("Platform/service workflow contracts passed (5 capabilities, 9 fixed platform actions).")


if __name__ == "__main__":
    main()
