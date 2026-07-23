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
LEGACY_ROUTE_IDS = {"overview", "project", "toolbox", "maintenance", "platforms", "learning", "doctor"}
HIGH_RISK_EXECUTE_COMMANDS = {
    "apply_env_repair_plan",
    "restore_user_environment",
    "restore_env_backup",
    "rollback_env_repair",
    "restore_environment_backup",
    "cleanup_path_entries",
    "apply_user_environment_configuration",
    "apply_python_repair",
    "apply_config_profile",
    "execute_profile_apply_plan",
    "execute_doctor_repair_plan",
    "switch_runtime",
    "uninstall_runtime",
    "install_jdk",
    "install_node",
    "install_python",
    "install_go",
    "install_maven_latest",
    "install_gradle_latest",
    "manage_local_service",
    "stop_local_service",
    "apply_project_configuration",
    "update_project_port",
    "execute_cleanup_plan",
    "execute_move_plan",
    "rollback_move",
    "execute_expansion_plan",
    "execute_c_drive_expansion",
    "clear_download_cache",
    "clean_dev_cache",
    "execute_port_resolution_plan",
    "execute_mysql_repair_plan",
    "apply_file_association_plan",
    "rollback_file_association_backup",
}

REQUIRED_PALETTE_ACTION_TITLES = {
    "Run Doctor",
    "Create Doctor Repair Plan",
    "Inspect Environment",
    "Create Java Stabilize Plan",
    "Scan Ports",
    "Diagnose Selected Port",
    "Search File Association App",
    "Create File Association Plan",
    "Apply Config Profile",
    "Create Profile Apply Plan",
    "Export Doctor Report",
    "Export Environment Report",
    "Export File Association Report",
    "Check Update",
    "Switch Theme: Light",
    "Switch Theme: Dark",
    "Switch Theme: System",
    "Switch Theme: High Contrast",
    "Open Backup Directory",
    "Open App Config Directory",
}

REQUIRED_FEATURE_FILES = ["index.ts", "api.ts", "render.ts", "events.ts", "state.ts", "types.ts"]

REQUIRED_CORE_FILES = [
    "invoke.ts",
    "i18n.ts",
    "risk.ts",
    "format.ts",
    "events.ts",
    "storage.ts",
    "validation.ts",
]

REQUIRED_I18N_FILES = [
    "tauri/src/core/i18n.ts",
    "tauri/src/core/locales/zh-CN.ts",
    "tauri/src/core/locales/en-US.ts",
]

REQUIRED_SAFETY_UI_FILES = [
    "tauri/src/components/disclaimerPanel.ts",
    "tauri/src/components/featureGuide.ts",
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
    if len(main_lines) > 50:
        return fail(f"tauri/src/main.ts has {len(main_lines)} lines; keep it under 50")

    bootstrap_ts = SRC / "app" / "bootstrap.ts"
    bootstrap_lines = bootstrap_ts.read_text(encoding="utf-8").splitlines()
    if len(bootstrap_lines) > 500:
        return fail(f"tauri/src/app/bootstrap.ts has {len(bootstrap_lines)} lines; keep it under 500")

    for path in [SRC / "app", SRC / "core", SRC / "ui" / "components", SRC / "ui" / "theme"]:
        if not path.is_dir():
            return fail(f"missing directory {path.relative_to(ROOT).as_posix()}")

    for name in REQUIRED_CORE_FILES:
        if not (SRC / "core" / name).is_file():
            return fail(f"missing core file tauri/src/core/{name}")

    for name in REQUIRED_I18N_FILES:
        if not (ROOT / name).is_file():
            return fail(f"missing i18n file {name}")

    for name in REQUIRED_SAFETY_UI_FILES:
        if not (ROOT / name).is_file():
            return fail(f"missing safety UI file {name}")

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
        api_text = (feature_dir / "api.ts").read_text(encoding="utf-8")
        render_text = (feature_dir / "render.ts").read_text(encoding="utf-8")
        events_text = (feature_dir / "events.ts").read_text(encoding="utf-8")
        index_text = (feature_dir / "index.ts").read_text(encoding="utf-8")
        if "invoke<" not in api_text and "invoke(" not in api_text:
            return fail(f"feature api has no invoke wrapper: tauri/src/features/{feature}/api.ts")
        if "JSON.stringify" in render_text or "legacy bootstrap" in render_text.lower() or "No real view" in render_text:
            return fail(f"feature render is not a real workbench view: tauri/src/features/{feature}/render.ts")
        if "bind" not in events_text and "register" not in events_text:
            return fail(f"feature events has no bind/register function: tauri/src/features/{feature}/events.ts")
        if "mount" not in index_text:
            return fail(f"feature index has no mount function: tauri/src/features/{feature}/index.ts")

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
        if rel in {"tauri/src/app/router.ts", "tauri/src/app/bootstrap.ts", "tauri/src/app/commandPalette.ts"}:
            for legacy_id in LEGACY_ROUTE_IDS:
                if f'id: "{legacy_id}"' in text or f'data-view="{legacy_id}"' in text:
                    return fail(f"legacy route id remains in {rel}: {legacy_id}")
        if rel == "tauri/src/app/commandPalette.ts":
            if text.count("id:") < 18:
                return fail("Command Palette must contain at least 18 commands")
            if 't("palette.goTo"' not in text or "routeLabel(route)" not in text:
                return fail("Command Palette route commands must use translated route labels")
            missing_locale_commands = sorted(
                key
                for key in ["palette.languageAuto", "palette.languageChinese", "palette.languageEnglish"]
                if key not in text
            )
            if missing_locale_commands:
                return fail("Command Palette missing language commands: " + ", ".join(missing_locale_commands))
            for command in HIGH_RISK_EXECUTE_COMMANDS:
                if f'invoke<{command}' in text or (f'"{command}"' in text and "execute:" in text):
                    return fail(f"Command Palette must not directly execute high-risk command: {command}")
    if direct_core_imports:
        return fail("direct @tauri-apps/api/core imports outside core/invoke.ts: " + ", ".join(direct_core_imports))
    if scattered_token_calls:
        return fail("create_confirmation_token must be centralized in tauri/src/core/risk.ts: " + ", ".join(scattered_token_calls))

    settings_render = (SRC / "features" / "settings" / "render.ts").read_text(encoding="utf-8")
    if "data-locale-mode" not in settings_render or "localeModeLabel" not in settings_render:
        return fail("Settings must include language mode controls")
    if "renderRiskLevelGuide" not in settings_render or "show-safety-notice" not in settings_render:
        return fail("Settings must include risk levels and safety notice entry")

    bootstrap_text = (SRC / "app" / "bootstrap.ts").read_text(encoding="utf-8")
    if "accept_safety_disclaimer" not in bootstrap_text or "safetyDisclaimerAccepted" not in bootstrap_text:
        return fail("Workbench startup must gate first launch on safety disclaimer acceptance")

    feature_guide = (SRC / "components" / "featureGuide.ts").read_text(encoding="utf-8")
    if "<details" not in feature_guide or "<summary" not in feature_guide:
        return fail("Feature guides must be collapsed by default with details/summary")
    for required_phrase in [
        "guide.whatDoes",
        "guide.whatNot",
        "guide.how",
        "guide.changes",
        "guide.noChanges",
        "guide.admin",
        "guide.backup",
        "guide.recovery",
        "guide.riskCritical",
    ]:
        if required_phrase not in feature_guide:
            return fail(f"Feature guide missing required section {required_phrase}")
    for feature in REQUIRED_FEATURES:
        if feature == "safeMode":
            continue
        render_path = SRC / "features" / feature / "render.ts"
        if render_path.exists():
            render_text = render_path.read_text(encoding="utf-8")
            if feature != "settings" and "renderFeatureGuide" not in render_text:
                return fail(f"feature render missing usage/risk guide: tauri/src/features/{feature}/render.ts")

    dashboard_events = (SRC / "features" / "dashboard" / "events.ts").read_text(encoding="utf-8")
    refresh_body = dashboard_events.split("export async function refreshDashboard", 1)[-1].split("context.root.innerHTML", 1)[0]
    if "getPortSummary" in refresh_body or "scan_ports" in refresh_body:
        return fail("Dashboard default refresh must not run port scan")

    ports_events = (SRC / "features" / "ports" / "events.ts").read_text(encoding="utf-8")
    if "Promise.allSettled" not in ports_events or "scanError" not in ports_events:
        return fail("Ports workbench must isolate scan/history/service failures")

    reports_render = (SRC / "features" / "reports" / "render.ts").read_text(encoding="utf-8")
    reports_events = (SRC / "features" / "reports" / "events.ts").read_text(encoding="utf-8")
    for required in [
        "export-port-report",
        "export-project-report",
        "exportPortReport",
        "exportProjectReport",
    ]:
        if required not in reports_render + reports_events:
            return fail(f"Reports workbench missing export coverage for {required}")

    cleanup_render = (SRC / "features" / "cleanup" / "render.ts").read_text(encoding="utf-8")
    cleanup_events = (SRC / "features" / "cleanup" / "events.ts").read_text(encoding="utf-8")
    for required in [
        "inspect-c-drive-rescue",
        "scan-large-files-c",
        "execute-expansion-plan",
        "execute-cleanup-plan",
        "createCDriveExpansionPlan",
        "executeCDriveExpansion",
        "cleanSelectedTargets",
        "inspectPartitionLayout",
        "scanLargeFiles",
        'renderPagination("cleanup-large-files"',
    ]:
        if required not in cleanup_render + cleanup_events:
            return fail(f"Cleanup workbench missing C drive rescue coverage for {required}")
    if 'command: "execute_expansion_plan"' not in cleanup_events or 'riskLevel: "critical"' not in cleanup_events:
        return fail("C drive expansion execution must use the critical execute_expansion_plan token contract")
    if 'command: "execute_cleanup_plan"' not in cleanup_events or 'planId: "clear-download-cache"' not in cleanup_events:
        return fail("Cleanup plan and download cache execution must use backend-matching token contracts")

    runtimes_render = (SRC / "features" / "runtimes" / "render.ts").read_text(encoding="utf-8")
    runtimes_events = (SRC / "features" / "runtimes" / "events.ts").read_text(encoding="utf-8")
    for required in ["node-version", "python-version", "go-version", "install-maven", "install-gradle", '"install_maven"', '"install_gradle"', "runtime-switch-workflow"]:
        if required not in runtimes_render + runtimes_events:
            return fail(f"Runtimes workbench missing multi-version install coverage for {required}")

    risk_text = (SRC / "ui" / "components" / "riskUx.ts").read_text(encoding="utf-8") + (
        SRC / "core" / "risk.ts"
    ).read_text(encoding="utf-8")
    for key in [
        "risk.whatWillChange",
        "risk.whyGated",
        "risk.backupReceipt",
        "risk.recoveryExpectation",
        "risk.tokenGate",
        "risk.result",
        "risk.verificationRollback",
        "risk.createTokenAndExecute",
    ]:
        if key not in risk_text:
            return fail(f"Risk UX missing i18n key {key}")

    shared_view = (SRC / "features" / "sharedView.ts").read_text(encoding="utf-8")
    if 't("state.retry")' not in shared_view or "loadSafe" not in shared_view:
        return fail("Shared loading/error helpers must use i18n and safe loader")

    print("Frontend architecture check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
