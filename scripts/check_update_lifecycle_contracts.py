from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(text: str, needle: str, location: str) -> None:
    if needle not in text:
        raise SystemExit(f"Update/lifecycle contract check failed: {location} missing {needle}")


def main() -> None:
    api = (ROOT / "tauri/src/features/settings/api.ts").read_text(encoding="utf-8")
    events = (ROOT / "tauri/src/features/settings/events.ts").read_text(encoding="utf-8")
    render = (ROOT / "tauri/src/features/settings/render.ts").read_text(encoding="utf-8")
    rust = (ROOT / "tauri/src-tauri/src/lib.rs").read_text(encoding="utf-8")

    for command in ("download_update", "launch_update_installer", "self_uninstall"):
        require(api, f'"{command}"', "settings api")
    require(api, "{ confirmationToken }", "settings api")

    for action in ("check-for-updates", "download-update", "launch-update-installer", "self-uninstall"):
        require(events, f'"{action}"', "settings events")
    for command in ("launch_update_installer", "self_uninstall"):
        require(events, f'command: "{command}"', "settings risk flow")
    require(rust, '"launch_update_installer",\n            &plan_id,\n            confirmation_token', "Rust update token gate")
    require(rust, 'require_risk_operation_token("self_uninstall", "self-uninstall", confirmation_token)', "Rust uninstall token gate")

    for selector in (
        "settings-update-section",
        "settings-update-result",
        "settings-update-error",
        "settings-uninstall-section",
        "settings-uninstall-result",
    ):
        require(render, selector, "settings render")

    require(rust, "verify_update_installer_file", "Rust update verification")
    require(rust, "更新安装包大小不匹配", "Rust download size verification")
    print("Update and lifecycle contract check passed.")


if __name__ == "__main__":
    main()
