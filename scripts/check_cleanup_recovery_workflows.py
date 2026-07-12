from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(text: str, needle: str, location: str) -> None:
    if needle not in text:
        raise SystemExit(f"Cleanup recovery workflow check failed: {location} missing {needle}")


def main() -> None:
    api = (ROOT / "tauri/src/features/cleanup/api.ts").read_text(encoding="utf-8")
    events = (ROOT / "tauri/src/features/cleanup/events.ts").read_text(encoding="utf-8")
    render = (ROOT / "tauri/src/features/cleanup/render.ts").read_text(encoding="utf-8")
    rust = (ROOT / "tauri/src-tauri/src/lib.rs").read_text(encoding="utf-8")

    for command in (
        "inspect_app_usage",
        "inspect_installed_software_usage",
        "add_archive_plan_item",
        "list_archive_plan_items",
        "remove_archive_plan_item",
        "create_generic_archive_plan",
        "execute_generic_archive_plan",
    ):
        require(api, f'"{command}"', "Cleanup API")
    for action in (
        "inspect-application-usage",
        "choose-archive-file",
        "add-archive-plan-item",
        "refresh-archive-plan-items",
        "create-generic-archive-plan",
        "execute-generic-archive-plan",
    ):
        require(events, f'"{action}"', "Cleanup events")
    for selector in (
        "cleanup-application-usage-section",
        "cleanup-application-usage-result",
        "cleanup-generic-archive-section",
        "cleanup-generic-archive-items",
        "cleanup-generic-archive-plan-preview",
        "cleanup-generic-archive-result",
    ):
        require(render, selector, "Cleanup render")

    require(events, 'command: "execute_generic_archive_plan"', "Cleanup risk flow")
    require(rust, 'command: "execute_generic_archive_plan"', "Rust risk registry")
    require(rust, 'require_risk_operation_token(\n        "execute_generic_archive_plan"', "Rust archive token gate")
    require(rust, "validate_generic_archive_source", "Rust source revalidation")
    require(rust, "target.exists()", "Rust no-overwrite check")
    require(rust, "fs::copy(&source, &target)", "Rust archive copy")
    require(rust, "Source hash changed after preview", "Rust pre-execution hash verification")
    require(rust, "sha256.eq_ignore_ascii_case(&entry.sha256)", "Rust target hash verification")
    require(rust, "fs::remove_file(&source)", "Rust source removal after copy")
    require(rust, "verified_targets", "Rust post-execution verification")
    require(rust, "rollback_guidance", "Rust rollback guidance")
    require(rust, "receipt_path", "Rust durable receipt")

    print("Cleanup application usage and generic archive workflow check passed.")


if __name__ == "__main__":
    main()
