from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(text: str, needle: str, location: str) -> None:
    if needle not in text:
        raise SystemExit(f"Environment/runtime workflow check failed: {location} missing {needle}")


def main() -> None:
    env_api = (ROOT / "tauri/src/features/environment/api.ts").read_text(encoding="utf-8")
    env_events = (ROOT / "tauri/src/features/environment/events.ts").read_text(encoding="utf-8")
    env_render = (ROOT / "tauri/src/features/environment/render.ts").read_text(encoding="utf-8")
    runtime_api = (ROOT / "tauri/src/features/runtimes/api.ts").read_text(encoding="utf-8")
    runtime_events = (ROOT / "tauri/src/features/runtimes/events.ts").read_text(encoding="utf-8")
    runtime_render = (ROOT / "tauri/src/features/runtimes/render.ts").read_text(encoding="utf-8")
    rust = (ROOT / "tauri/src-tauri/src/lib.rs").read_text(encoding="utf-8")

    for command in (
        "analyze_python_environment",
        "preview_python_repair",
        "apply_python_repair",
        "open_python_alias_settings",
        "inspect_env_backup",
        "restore_env_backup",
        "restore_environment_backup",
        "apply_user_environment_configuration",
    ):
        require(env_api, f'"{command}"', "Environment API")
    for command in ("apply_python_repair", "restore_env_backup", "restore_environment_backup"):
        require(env_events, f'command: "{command}"' if command == "apply_python_repair" else command, "Environment risk flow")
        require(rust, f'command: "{command}"', "Rust risk registry")
    require(env_events, 'command: "apply_user_environment_configuration"', "Environment configuration risk flow")
    require(rust, '"apply_user_environment_configuration"', "Rust risk registry")

    for action in (
        "analyze-python-environment",
        "open-python-alias-settings",
        "preview-python-repair",
        "execute-python-repair",
        "create-environment-restore-plan",
        "execute-environment-restore",
        "apply-user-environment-configuration",
        "cleanup-path",
    ):
        require(env_events, f'"{action}"', "Environment events")
    for selector in (
        "environment-python-health-section",
        "environment-python-analysis-result",
        "environment-python-plan-preview",
        "environment-python-repair-result",
        "environment-python-alias-result",
        "environment-restore-section",
        "environment-restore-plan-preview",
        "environment-restore-result",
        "environment-configuration-section",
        "environment-configuration-preview",
        "environment-configuration-result",
        "environment-configuration-error",
        "environment-path-cleanup-result",
        "environment-path-cleanup-error",
    ):
        require(env_render, selector, "Environment render")
    require(env_events, "await inspectEnvironmentReliability()", "Environment post-restore verification")
    require(env_events, "await Promise.all([analyzePythonEnvironment(), inspectEnvironmentReliability()])", "Python post-repair verification")
    require(env_events, "state.configurationResult =", "Environment configuration durable result")
    require(env_events, "state.configurationError =", "Environment configuration durable error")
    require(env_events, "state.pathCleanupResult =", "PATH cleanup durable result")
    require(env_events, "state.pathCleanupError =", "PATH cleanup durable error")
    require(env_render, "analysis.firstPython3OnPath", "python3 execution alias status")
    require(env_render, "Rollback guidance", "Python rollback guidance")

    require(runtime_api, '"verify_external_jdk"', "Runtime API")
    require(runtime_events, '"verify-external-jdk"', "Runtime events")
    require(runtime_render, "runtime-external-jdk-section", "Runtime render")
    require(runtime_render, "runtime-external-jdk-result", "Runtime render")
    require(runtime_render, "java executable", "Runtime executable evidence")
    require(runtime_render, "Suggested JAVA_HOME", "Runtime JAVA_HOME guidance")
    require(runtime_render, "row.backendKind === \"jdk\" && !row.managed", "External-only JDK candidates")

    print("Environment and external JDK workflow check passed.")


if __name__ == "__main__":
    main()
