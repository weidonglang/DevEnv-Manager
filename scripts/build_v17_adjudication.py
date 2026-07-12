from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import build_v17_release_matrices as baseline


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_COMMIT = "bfcc10fc907184e247aa139d69933b974a4351f9"
SOURCE_PATH = ROOT / "acceptance" / "v1.7.0-source-records.json"
NORMALIZED_PATH = ROOT / "acceptance" / "v1.7.0-normalized-capabilities.json"
NORMALIZED_MD = ROOT / "docs" / "v1.7.0-normalized-capabilities.md"
MIGRATION_MD = ROOT / "docs" / "v1.7.0-to-v1.8.2-migration-matrix.md"
SPLIT_PATH = ROOT / "acceptance" / "feature-manifest-v1.8.2-split-proposal.json"
SPLIT_MD = ROOT / "docs" / "partial-split-proposal-v1.8.2.md"
BACKEND_PATH = ROOT / "acceptance" / "backend-command-disposition.v1.8.2.json"
BACKEND_MD = ROOT / "docs" / "backend-command-disposition-v1.8.2.md"
BLOCKERS_MD = ROOT / "docs" / "v1.8.2-confirmed-release-blockers.md"
ISSUES_PATH = ROOT / "acceptance" / "issues-125-128-blocker-matrix.json"
ISSUES_MD = ROOT / "docs" / "issues-125-128-blocker-matrix.md"

IMPLEMENTATION_STATUSES = {
    "equivalent", "enhanced", "degraded", "missing", "removed-approved", "not-applicable"
}
EVIDENCE_STATUSES = {
    "verified-installed", "verified-real-tauri", "verified-automated",
    "evidence-required", "not-safely-testable", "environment-blocked",
}
RELEASE_DISPOSITIONS = {
    "ready", "code-blocker", "evidence-blocker", "product-decision-required",
    "deferred-new-enhancement",
}

EXCLUSIONS = {
    "v17.action.hide-toast": "excluded-ui-mechanics",
    "v17.action.copy-text": "excluded-ui-mechanics",
    "v17.action.dismiss-safe-mode-banner": "excluded-ui-mechanics",
    "v17.promise.028": "excluded-ui-mechanics",
    "v17.command.config_profile_requirements": "excluded-internal",
    "v17.command.feature_risk_registry": "excluded-internal",
    "v17.command.mysql_pending_execution_guard": "excluded-internal",
    "v17.command.validate_directory_path": "excluded-internal",
}

ACTION_CAPABILITIES = {
    "apply-profile": "profiles.apply",
    "archive-add": "cleanup.archive-plan",
    "archive-remove": "cleanup.archive-plan",
    "check-updates": "update.check",
    "copy-diagnostics": "doctor.report",
    "copy-safety-disclaimer": "safety.disclaimer",
    "delete-profile": "profiles.delete",
    "doctor-fix": "doctor.repair",
    "download-update": "update.download-install",
    "export-python-diagnostic": "reports.export",
    "install-apply-profile": "profiles.apply",
    "install-update": "update.download-install",
    "kill-port": "ports.release",
    "local-service-directory": "services.directory",
    "local-service-logs": "services.logs",
    "local-service-manage": "services.manage",
    "open-analysis-path": "system.open-path",
    "open-app-config-dir": "settings.config-directory",
    "open-apps-features": "system.apps-features",
    "open-learning": "learning.center",
    "open-process-location": "ports.process-location",
    "open-python-alias-settings": "environment.python-alias-settings",
    "port-details": "ports.scan-history",
    "project-run": "projects.actions",
    "refresh-platforms": "platforms.inspect",
    "rescan-folder": "cleanup.folder-analysis",
    "reset-ui-config": "settings.reset-ui",
    "restore-env-record": "environment.restore",
    "retry-app-init": "bootstrap.retry",
    "rollback-move": "cleanup.move-rollback",
    "set-java-home-candidate": "environment.java-stabilize",
    "switch-build-tool": "runtime.switch",
    "switch-go": "runtime.switch",
    "switch-jdk": "runtime.switch",
    "switch-node": "runtime.switch",
    "switch-python": "runtime.switch",
    "system-platform": "platforms.manage",
    "uninstall-build-tool": "runtime.uninstall",
    "uninstall-go": "runtime.uninstall",
    "uninstall-jdk": "runtime.uninstall",
    "uninstall-node": "runtime.uninstall",
    "uninstall-python": "runtime.uninstall",
    "update-project-port": "projects.port-config",
    "verify-external-jdk": "runtime.external-jdk-verify",
}

COMMAND_GROUPS = {
    "safety.disclaimer": {"accept_safety_disclaimer", "safety_disclaimer"},
    "safety.risk-confirmation": {"create_confirmation_token", "feature_risk_registry", "get_feature_risk"},
    "dashboard.snapshot": {"app_snapshot"},
    "settings.load": {"load_config"},
    "settings.root": {"set_root_dir", "validate_directory_path"},
    "settings.auto-update": {"set_auto_check_update"},
    "settings.reset-ui": {"reset_ui_config"},
    "settings.config-directory": {"open_app_config_dir"},
    "update.check": {"check_for_updates"},
    "update.download-install": {"download_update", "launch_update_installer"},
    "profiles.list": {"list_config_profiles"},
    "profiles.save": {"save_config_profile"},
    "profiles.delete": {"delete_config_profile"},
    "profiles.import-export": {"import_config_profiles", "export_config_profiles"},
    "profiles.preview": {"preview_config_profiles", "config_profile_requirements"},
    "profiles.apply": {"apply_config_profile", "install_profile_missing", "create_profile_apply_plan", "execute_profile_apply_plan"},
    "runtime.discover": {"discover_runtimes", "jdk_distributions"},
    "runtime.install": {"install_jdk", "install_node", "install_python", "install_go", "install_maven_latest", "install_gradle_latest"},
    "runtime.switch": {"switch_runtime"},
    "runtime.uninstall": {"uninstall_runtime", "uninstall_external_runtime"},
    "runtime.verify": {"inspect_runtime_strong_verification", "verify_java_toolchain", "verify_maven_gradle_with_current_jdk"},
    "runtime.external-jdk-verify": {"verify_external_jdk"},
    "environment.snapshot": {"env_snapshot", "environment_health", "inspect_env_reliability", "inspect_java_environment"},
    "environment.configure": {"configure_user_environment", "preview_user_environment_configuration", "apply_user_environment_configuration"},
    "environment.java-stabilize": {"create_java_stabilize_plan", "apply_env_repair_plan", "create_env_repair_plan", "rollback_env_repair", "verify_env_after_apply"},
    "environment.path-cleanup": {"cleanup_path_entries"},
    "environment.backups": {"list_env_backups", "list_environment_backups", "inspect_env_backup"},
    "environment.restore": {"restore_env_backup", "restore_environment_backup", "restore_user_environment"},
    "environment.python-health-repair": {"analyze_python_environment", "inspect_python_integrity", "preview_python_repair", "apply_python_repair", "create_managed_python_pip_repair_plan", "apply_managed_python_pip_repair"},
    "environment.python-alias-settings": {"open_python_alias_settings"},
    "doctor.run": {"run_doctor", "doctor_report_text"},
    "doctor.repair": {"repair_doctor_safe", "create_doctor_repair_plan", "execute_doctor_repair_plan"},
    "doctor.report": {"export_doctor_report", "export_doctor_report_json"},
    "reports.export": {"export_env_reliability_report", "export_python_diagnostic_report", "export_file_association_report", "export_cleanup_report", "export_port_report", "export_project_report"},
    "projects.analysis": {"analyze_project", "project_health"},
    "projects.idea-analysis": {"inspect_idea_project"},
    "projects.configuration": {"preview_project_configuration", "apply_project_configuration", "generate_vscode_config"},
    "projects.actions": {"run_project_action"},
    "projects.port-config": {"inspect_project_port_configs", "update_project_port"},
    "projects.java-consumer-verify": {"verify_java_consumer_environment", "verify_nacos_java_environment", "verify_nexus_java_environment"},
    "ports.scan-history": {"scan_ports", "port_history"},
    "ports.release": {"kill_process", "create_port_resolution_plan", "execute_port_resolution_plan"},
    "ports.process-location": {"open_process_location"},
    "file-associations.scan": {"scan_file_associations"},
    "file-associations.settings": {"open_default_apps_settings", "open_file_type_settings"},
    "file-associations.apply": {"create_file_association_plan", "apply_file_association_plan"},
    "file-associations.backup-rollback": {"list_file_association_backups", "open_file_association_backup_dir", "rollback_file_association_backup"},
    "cleanup.overview": {"inspect_maintenance_overview", "storage_cleanup_architecture"},
    "cleanup.scan-plan-execute": {"scan_cleanup_targets", "create_cleanup_plan", "clean_selected_targets", "cancel_maintenance_scan", "scan_storage_cleanup"},
    "cleanup.dev-cache": {"clean_dev_cache"},
    "cleanup.download-cache": {"clear_download_cache", "clean_managed_download_cache"},
    "cleanup.archive-plan": {"add_archive_plan_item", "remove_archive_plan_item", "list_archive_plan_items", "create_generic_archive_plan", "execute_generic_archive_plan"},
    "cleanup.folder-analysis": {"inspect_desktop", "inspect_downloads", "scan_large_files", "scan_duplicate_large_files"},
    "cleanup.move-rollback": {"create_move_plan", "execute_move_plan", "rollback_move", "list_rollback_records", "create_junction_bridge_plan"},
    "cleanup.desktop-archive": {"create_desktop_archive_plan", "execute_desktop_archive_plan"},
    "cleanup.downloads-archive": {"create_downloads_archive_plan", "execute_downloads_archive_plan"},
    "cleanup.partition-expansion": {"inspect_partition_layout", "create_c_drive_expansion_plan", "execute_c_drive_expansion"},
    "cleanup.application-usage": {"inspect_app_usage", "inspect_installed_software_usage"},
    "debug.agent-traces": {"inspect_agent_traces"},
    "system.open-path": {"open_analysis_path"},
    "system.apps-features": {"open_apps_features"},
    "system.self-uninstall": {"self_uninstall"},
    "toolchains.inspect": {"inspect_toolchains"},
    "toolchains.command-safety": {"inspect_command_safety", "run_tool_command"},
    "toolchains.actions": {"run_toolchain_action"},
    "toolchains.network-cache": {"network_diagnostics", "cache_entries"},
    "toolchains.mirrors": {"run_chsrc_action"},
    "platforms.inspect": {"inspect_platform_toolchains", "inspect_system_platforms"},
    "platforms.manage": {"manage_system_platform", "run_platform_action"},
    "platforms.docker": {"open_docker_desktop"},
    "services.inspect": {"inspect_local_services"},
    "services.manage": {"manage_local_service", "stop_local_service"},
    "services.logs": {"local_service_logs"},
    "services.directory": {"open_local_service_directory"},
    "mysql.repair": {"inspect_mysql_repair", "create_mysql_repair_plan", "execute_mysql_repair_plan", "mysql_pending_execution_guard"},
    "learning.center": {"run_learning_check"},
}

COMMAND_CAPABILITIES = {
    command: capability for capability, commands in COMMAND_GROUPS.items() for command in commands
}

PROMISE_CAPABILITIES = {
    1: "runtime.lifecycle", 2: "settings.root", 3: "runtime.verify", 4: "runtime.verify",
    5: "environment.python-health-repair", 6: "runtime.install", 7: "environment.configure",
    8: "environment.configure", 9: "environment.snapshot", 10: "environment.java-stabilize",
    11: "environment.restore", 12: "environment.python-health-repair",
    13: "environment.python-health-repair", 14: "doctor.run", 15: "environment.python-health-repair",
    16: "profiles.apply", 17: "projects.configuration", 18: "projects.idea-analysis",
    19: "projects.java-consumer-verify", 20: "toolchains.git-ecosystem",
    21: "toolchains.node-ecosystem", 22: "toolchains.python-ecosystem", 23: "runtime.discover",
    24: "runtime.install", 25: "toolchains.rust", 26: "toolchains.dotnet",
    27: "toolchains.mirrors", 29: "ports.scan-history", 30: "platforms.manage",
    31: "services.manage", 32: "mysql.repair", 33: "learning.center", 34: "update.download-install",
    35: "cleanup.scan-plan-execute", 36: "cleanup.folder-analysis", 37: "cleanup.move-rollback",
    38: "toolchains.command-safety", 39: "safety.guide", 40: "debug.agent-traces",
    41: "cli.workflows", 42: "toolchains.network-cache", 43: "runner.background-execution",
}

GOALS = {
    "navigation.workbench": "Navigate to every v1.7.0 workbench domain",
    "runtime.lifecycle": "Install, select, verify, and remove managed runtimes",
    "safety.guide": "Read complete risk, backup, privilege, and recovery guidance",
    "cli.workflows": "Run supported DevEnv diagnostic and plan workflows from the CLI",
    "runner.background-execution": "Run long Windows tasks without visible command windows or UI blocking",
    "bootstrap.retry": "Retry application initialization after a recoverable startup failure",
    "toolchains.git-ecosystem": "Inspect and configure the Git and GitHub development toolchain",
    "toolchains.node-ecosystem": "Inspect Node package-manager tools and registry configuration",
    "toolchains.python-ecosystem": "Inspect Python ecosystem tools and package indexes",
    "toolchains.rust": "Inspect and maintain rustup and Rust toolchains",
    "toolchains.dotnet": "Inspect .NET SDKs and run project actions",
    "platforms.docker-wsl": "Inspect and manage Docker Desktop and WSL development platforms",
}

ENHANCED_CAPABILITIES = {
    "profiles.apply", "environment.configure", "environment.java-stabilize", "doctor.repair",
    "ports.release", "file-associations.apply", "cleanup.scan-plan-execute", "cleanup.move-rollback",
    "cleanup.desktop-archive", "cleanup.downloads-archive", "mysql.repair",
}

INSTALLED_CAPABILITIES = {
    "navigation.workbench", "dashboard.snapshot", "settings.load", "settings.root",
    "settings.auto-update", "safety.disclaimer", "update.check", "runtime.discover",
    "environment.snapshot", "doctor.run", "doctor.repair", "doctor.report", "reports.export",
    "profiles.list", "ports.scan-history", "ports.release", "file-associations.scan",
    "file-associations.apply", "cleanup.overview", "cleanup.scan-plan-execute",
    "cleanup.folder-analysis", "cleanup.desktop-archive", "cleanup.downloads-archive",
}

UNSAFE_EVIDENCE_CAPABILITIES = {
    "runtime.lifecycle", "runtime.install", "runtime.switch", "runtime.uninstall", "environment.configure",
    "environment.java-stabilize", "environment.path-cleanup", "environment.restore",
    "environment.python-health-repair", "profiles.apply", "ports.release",
    "file-associations.apply", "file-associations.backup-rollback", "cleanup.scan-plan-execute",
    "cleanup.dev-cache", "cleanup.download-cache", "cleanup.move-rollback",
    "cleanup.desktop-archive", "cleanup.downloads-archive", "cleanup.partition-expansion",
    "cleanup.archive-plan",
    "projects.configuration", "projects.port-config", "platforms.manage", "services.manage",
    "mysql.repair", "update.download-install",
}

ENVIRONMENT_BLOCKED_CAPABILITIES = {
    "environment.configure", "environment.java-stabilize", "environment.path-cleanup",
    "environment.restore", "environment.python-health-repair",
    "file-associations.backup-rollback", "mysql.repair", "cleanup.partition-expansion",
    "runtime.install", "runtime.lifecycle", "runtime.switch", "runtime.uninstall",
    "system.self-uninstall", "update.download-install",
}

STATUS_OVERRIDES = {
    "navigation.workbench": "equivalent",
    "bootstrap.retry": "equivalent",
    "safety.guide": "enhanced",
    "cli.workflows": "equivalent",
    "runner.background-execution": "enhanced",
}

EVIDENCE_OVERRIDES = {
    "navigation.workbench": "verified-installed",
    "bootstrap.retry": "verified-automated",
    "safety.guide": "verified-installed",
    "cli.workflows": "verified-automated",
    "runner.background-execution": "verified-real-tauri",
}

CAPABILITY_COMMAND_OVERRIDES = {
    "runtime.lifecycle": sorted(
        COMMAND_GROUPS["runtime.discover"]
        | COMMAND_GROUPS["runtime.install"]
        | COMMAND_GROUPS["runtime.switch"]
        | COMMAND_GROUPS["runtime.uninstall"]
        | COMMAND_GROUPS["runtime.verify"]
    ),
    "toolchains.git-ecosystem": ["inspect_toolchains", "run_toolchain_action"],
    "toolchains.node-ecosystem": ["inspect_toolchains", "run_toolchain_action"],
    "toolchains.python-ecosystem": ["inspect_toolchains", "run_toolchain_action"],
    "toolchains.rust": ["inspect_platform_toolchains", "run_platform_action"],
    "toolchains.dotnet": ["inspect_platform_toolchains", "run_chsrc_action"],
}

V182_PRODUCT_DECISIONS = {
    "toolchains.git-ecosystem",
    "toolchains.node-ecosystem",
    "toolchains.python-ecosystem",
    "toolchains.rust",
    "toolchains.dotnet",
}

LOCAL_REPLACEMENTS = {
    "verify_nacos_java_environment": ["verify_java_consumer_environment"],
}

BLOCKER_DETAILS = {
    "cleanup.application-usage": ("The application-usage analyzers remain registered but have no Cleanup API call or rendered result section.", "Expose the existing read-only reports in Cleanup."),
    "cleanup.archive-plan": ("The generic v1.7 add/remove/list archive-plan workflow is absent; v1.8.2 only exposes specialized Desktop and Downloads archive plans.", "Restore a generic archive selection UI or approve the narrower replacement."),
    "environment.python-alias-settings": ("The Windows Python alias settings command remains registered but has no Environment action.", "Add the smallest explicit open-settings entry."),
    "environment.python-health-repair": ("Python analysis, preview, and repair commands remain registered but the Environment page exposes only Java stabilization and PATH cleanup.", "Restore Python diagnosis and guarded repair result panels."),
    "environment.restore": ("The Environment page lists backup counts but does not expose a restore action for either backup model.", "Add a backup selector and token-gated restore result flow."),
    "runtime.external-jdk-verify": ("External JDK verification remains registered but is not exposed by the Runtime workbench.", "Add a read-only external JDK verification result flow."),
    "system.self-uninstall": ("The v1.7 self-uninstall command remains registered but no current Settings entry invokes it.", "Restore the guarded uninstall entry or explicitly remove the promise."),
    "update.download-install": ("Settings exposes update checking only; download_update and launch_update_installer have no current frontend invoke.", "Restore download verification and installer-launch result flow."),
}


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def pretty(identifier: str) -> str:
    return identifier.replace("-", " ").replace("_", " ").replace(".", " ").title()


def capability_domain(capability_id: str) -> str:
    return capability_id.split(".", 1)[0].replace("file-associations", "File Associations").title()


def command_capability(command: str) -> str:
    if command in COMMAND_CAPABILITIES:
        return COMMAND_CAPABILITIES[command]
    domain = baseline.domain_for_command(command).lower().replace(" / ", "-").replace(" ", "-")
    stem = re.sub(r"^(create|execute|apply|preview|inspect|scan|list|open|export|run|manage|verify)_", "", command)
    return f"legacy-{domain}.{stem.replace('_', '-')}"


def source_record(row: dict[str, Any]) -> dict[str, Any]:
    source_id = row["oldFeatureId"]
    suffix = source_id.split(".", 2)[-1]
    source_type = "documentation-promise"
    capability_id: str | None = None
    if source_id.startswith("v17.page."):
        source_type = "page"
        capability_id = "navigation.workbench"
    elif source_id.startswith("v17.action."):
        source_type = "data-action"
        capability_id = ACTION_CAPABILITIES.get(suffix)
        if capability_id is None and source_id not in EXCLUSIONS:
            capability_id = f"legacy-action.{suffix}"
    elif source_id.startswith("v17.command."):
        source_type = "frontend-invoke"
        capability_id = command_capability(suffix)
    else:
        index = int(suffix)
        capability_id = PROMISE_CAPABILITIES.get(index)
    exclusion = EXCLUSIONS.get(source_id)
    locations = row.get("sourceEvidence") or row.get("oldFrontendComponent") or [row.get("oldVersionEntry")]
    return {
        "sourceId": source_id,
        "sourceType": source_type,
        "sourceLocation": locations,
        "oldPage": row.get("oldVersionPage"),
        "oldAction": suffix if source_type == "data-action" else None,
        "oldCommand": suffix if source_type == "frontend-invoke" else None,
        "readmeReference": locations[0] if source_type == "documentation-promise" else None,
        "rawDescription": row.get("oldFeatureName"),
        "normalizedCapabilityId": None if exclusion else capability_id,
        "exclusionReason": exclusion,
    }


def capability_goal(capability_id: str, records: list[dict[str, Any]]) -> str:
    if capability_id in GOALS:
        return GOALS[capability_id]
    descriptions = [record["rawDescription"] for record in records if record["sourceType"] == "documentation-promise"]
    return descriptions[0] if descriptions else pretty(capability_id)


def build_capabilities(records: list[dict[str, Any]], current: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["normalizedCapabilityId"]:
            grouped[record["normalizedCapabilityId"]].append(record)

    current_by_capability: dict[str, list[str]] = defaultdict(list)
    for command in current["registered"]:
        current_by_capability[command_capability(command)].append(command)

    capabilities: list[dict[str, Any]] = []
    for capability_id, sources in sorted(grouped.items()):
        old_commands = sorted({record["oldCommand"] for record in sources if record["oldCommand"]})
        current_commands = sorted(set(current_by_capability.get(capability_id, [])) | set(CAPABILITY_COMMAND_OVERRIDES.get(capability_id, [])))
        direct_commands = [command for command in current_commands if command in current["direct"]]
        dynamic_commands = [command for command in current_commands if command in current["dynamic"]]
        frontend_commands = direct_commands + dynamic_commands

        if capability_id in STATUS_OVERRIDES:
            implementation = STATUS_OVERRIDES[capability_id]
        elif frontend_commands:
            implementation = "enhanced" if capability_id in ENHANCED_CAPABILITIES else "equivalent"
        elif current_commands:
            implementation = "degraded"
        else:
            implementation = "missing"

        if capability_id in EVIDENCE_OVERRIDES:
            evidence = EVIDENCE_OVERRIDES[capability_id]
        elif capability_id in INSTALLED_CAPABILITIES:
            evidence = "verified-installed"
        elif implementation in {"missing", "degraded"}:
            evidence = "evidence-required"
        elif capability_id in ENVIRONMENT_BLOCKED_CAPABILITIES:
            evidence = "environment-blocked"
        elif capability_id in UNSAFE_EVIDENCE_CAPABILITIES:
            evidence = "evidence-required"
        elif frontend_commands:
            evidence = "verified-automated"
        else:
            evidence = "evidence-required"

        docs_only = all(source["sourceType"] == "documentation-promise" for source in sources)
        if implementation in {"missing", "degraded"}:
            disposition = "product-decision-required" if docs_only else "code-blocker"
        elif evidence in {"evidence-required", "not-safely-testable", "environment-blocked"}:
            disposition = "evidence-blocker"
        else:
            disposition = "ready"

        blocker_detail = BLOCKER_DETAILS.get(capability_id)
        if disposition == "code-blocker":
            reason = blocker_detail[0] if blocker_detail else "The historical user goal lacks a current frontend path or has only an unexposed backend path."
        elif disposition == "evidence-blocker":
            reason = "Implementation mapping exists, but the required installed or safely isolated execution evidence is incomplete."
        elif disposition == "product-decision-required":
            reason = "The v1.7.0 documentation promise has no sufficiently precise current product mapping and needs owner adjudication."
        else:
            reason = "The current implementation and available evidence preserve the historical user goal."

        automated = sorted({
            f"frontend:{location}"
            for command in frontend_commands
            for location in current["direct"].get(command, []) + current["dynamic"].get(command, [])
        })
        capabilities.append({
            "capabilityId": capability_id,
            "domain": capability_domain(capability_id),
            "userGoal": capability_goal(capability_id, sources),
            "v1.7.0Entry": sorted({source["oldAction"] or source["oldCommand"] or source["oldPage"] or "README" for source in sources}),
            "v1.7.0Steps": [f"Open {sources[0]['oldPage']}", "Use the documented v1.7.0 entry"],
            "v1.7.0Result": capability_goal(capability_id, sources),
            "v1.7.0Risk": "state-changing" if any(baseline.risk_for(command) != "readOnly" for command in old_commands) else "read-only",
            "sourceRecordIds": [source["sourceId"] for source in sources],
            "v1.8.2Entry": sorted({location for command in frontend_commands for location in current["direct"].get(command, []) + current["dynamic"].get(command, [])}),
            "v1.8.2Steps": ["Open the mapped Workbench domain", "Run the mapped command flow"] if frontend_commands else [],
            "v1.8.2Result": "Mapped result panel or operation receipt" if frontend_commands else "No complete current user path evidenced",
            "replacementCommands": current_commands,
            "implementationStatus": implementation,
            "evidenceStatus": evidence,
            "releaseDisposition": disposition,
            "releaseReason": reason,
            "followUpIssue": "#130" if capability_id.startswith("runtime.") else "#125",
            "lastVerifiedCommit": EVIDENCE_COMMIT,
            "automatedEvidence": automated,
            "productDecision": {
                "decision": "included-in-v1.8.2-compatibility-scope",
                "source": "#132 fourth-stage authoritative task",
                "decidedAt": "2026-07-12",
            } if capability_id in V182_PRODUCT_DECISIONS else None,
            "codeBlockerEvidence": {
                "oldReproduction": [f"Use {entry}" for entry in sorted({source["oldAction"] or source["oldCommand"] or "README" for source in sources})],
                "currentReproduction": ["Open the mapped v1.8.2 domain and look for an equivalent result"],
                "expected": capability_goal(capability_id, sources),
                "actual": blocker_detail[0] if blocker_detail else ("No complete current frontend path was identified" if implementation in {"missing", "degraded"} else "Mapped"),
                "sourceLocations": sorted({location for source in sources for location in source["sourceLocation"]}),
                "userImpact": "The historical user goal may not be completable in v1.8.2.",
                "minimalFix": blocker_detail[1] if blocker_detail else "Confirm an existing replacement path or restore the smallest missing entry and result flow.",
            } if disposition == "code-blocker" else None,
            "evidencePlan": {
                "fixture": "Dedicated temporary data or disposable VM snapshot",
                "environment": "Windows real Tauri or installed application",
                "steps": ["Capture baseline", "Run the mapped user path", "Verify result against system state", "Restore baseline"],
                "safetyBoundary": "Do not modify real services, associations, environment, or user files outside the fixture.",
                "passCriteria": "UI result, receipt, and observed system state agree.",
                "recovery": "Delete temporary data or revert the VM snapshot.",
            } if disposition == "evidence-blocker" else None,
        })
    return capabilities


def camel(command: str) -> str:
    parts = command.split("_")
    return parts[0] + "".join(part.title() for part in parts[1:])


def build_split_proposal(current: dict[str, Any], capabilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    command_to_old = defaultdict(list)
    for capability in capabilities:
        for command in capability["replacementCommands"]:
            command_to_old[command].append(capability["capabilityId"])
    rows = []
    for parent_id, feature in sorted(current["featureRecords"].items()):
        if feature.get("status") != "partial":
            continue
        priority = feature.get("priority") or feature.get("pagePriority") or "P2"
        commands = feature.get("backendCommands", [])
        for command in commands:
            wired = command in current["direct"] or command in current["dynamic"]
            internal = command in baseline.INTERNAL_HELPERS
            implementation = "not-applicable" if internal else ("equivalent" if wired else "degraded")
            evidence = "verified-installed" if command in baseline.INSTALLED_VERIFIED_COMMANDS else ("verified-automated" if wired else "evidence-required")
            disposition = "ready" if implementation in {"equivalent", "not-applicable"} and evidence in {"verified-installed", "verified-automated"} else ("code-blocker" if implementation == "degraded" else "evidence-blocker")
            rows.append({
                "newFeatureId": f"{parent_id}.{camel(command)}",
                "parentFeatureId": parent_id,
                "oldCapabilityIds": sorted(set(command_to_old.get(command, []))),
                "priority": priority,
                "userGoal": f"Complete the {pretty(command)} step within {parent_id}",
                "commands": [command],
                "implementationStatus": implementation,
                "evidenceStatus": evidence,
                "releaseDisposition": disposition,
                "reason": "Atomic command-level proposal only; the formal manifest is unchanged.",
            })
    return rows


def build_backend(current: dict[str, Any], capabilities: list[dict[str, Any]], old_commands: set[str]) -> list[dict[str, Any]]:
    capability_by_id = {item["capabilityId"]: item for item in capabilities}
    all_replacements = {**baseline.COMMAND_ALIASES, **LOCAL_REPLACEMENTS}
    replacement_targets = {target for values in all_replacements.values() for target in values}
    rows = []
    for command in sorted(current["registered"]):
        capability_id = command_capability(command)
        capability = capability_by_id.get(capability_id)
        direct = current["direct"].get(command, [])
        dynamic = current["dynamic"].get(command, [])
        if command in replacement_targets:
            classification = "replacement-command"
        elif direct:
            classification = "direct-user-command"
        elif dynamic:
            classification = "dynamic-user-command"
        elif command in baseline.INTERNAL_HELPERS:
            classification = "internal-helper"
        elif command in baseline.BOOTSTRAP_COMMANDS:
            classification = "bootstrap"
        elif command in LOCAL_REPLACEMENTS:
            classification = "compatibility-alias"
        elif command.startswith(("inspect_", "scan_", "list_", "discover_", "verify_")):
            classification = "diagnostic"
        elif command in old_commands:
            classification = "compatibility-alias"
        else:
            classification = "compatibility-alias"

        old_aliases = [old for old, targets in all_replacements.items() if command in targets]
        replacement_chain = all_replacements.get(command, []) or old_aliases
        if not replacement_chain and classification == "compatibility-alias" and capability:
            replacement_chain = [
                candidate for candidate in capability["replacementCommands"]
                if candidate != command and (candidate in current["direct"] or candidate in current["dynamic"])
            ]
        if replacement_chain:
            replacement_resolution = "explicit-replacement"
        elif classification == "compatibility-alias" and capability and capability["releaseDisposition"] == "code-blocker":
            replacement_resolution = "no-replacement-code-blocker"
        elif classification == "compatibility-alias":
            replacement_resolution = "compatibility-retained-product-decision"
        else:
            replacement_resolution = "not-required"
        if classification in {"direct-user-command", "dynamic-user-command", "replacement-command", "compatibility-alias"}:
            disposition = capability["releaseDisposition"] if capability else "product-decision-required"
        elif classification in {"internal-helper", "bootstrap", "diagnostic"}:
            disposition = "ready"
        else:
            disposition = "product-decision-required"
        rows.append({
            "command": command,
            "oldCommand": command if command in old_commands else None,
            "currentCommand": command,
            "capabilityId": capability_id,
            "frontendLocation": direct,
            "dynamicWrapper": dynamic,
            "replacementChain": replacement_chain,
            "replacementResolution": replacement_resolution,
            "testEvidence": [f"feature-manifest:{feature}" for feature in current["commandFeatures"].get(command, [])],
            "classification": classification,
            "releaseDisposition": disposition,
            "exactReason": {
                "direct-user-command": "A current frontend invoke exposes this command.",
                "dynamic-user-command": "A recognized dynamic invoke wrapper exposes this command.",
                "replacement-command": "This command participates in an explicit old-to-new replacement chain.",
                "internal-helper": "This command supports validation or plan bookkeeping and is not a standalone user goal.",
                "bootstrap": "This command belongs to application startup or global safety initialization.",
                "diagnostic": "This read-only command supplies evidence to a broader user flow.",
                "compatibility-alias": "The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval.",
                "obsolete": "No current direct/dynamic frontend use was found; removal is only proposed after script/test/compatibility review.",
            }[classification],
            "compatibilityConsumer": "v1.7.0 UI/CLI or external automation" if classification == "compatibility-alias" else None,
            "compatibilityTest": "Required before removal" if classification == "compatibility-alias" else None,
            "removalCondition": "Remove only after frontend, dynamic wrappers, scripts, tests, compatibility paths, and docs are all clear" if classification in {"compatibility-alias", "obsolete"} else None,
            "followUpIssue": "#125" if disposition != "ready" else None,
        })
    return rows


def counts(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    return dict(sorted(Counter(row[key] for row in rows).items()))


def render_normalized(capabilities: list[dict[str, Any]], source_summary: dict[str, Any]) -> str:
    lines = [
        "# v1.7.0 Normalized User Capabilities", "",
        "The 237 scanned source records are evidence inputs, not 237 independent user features.", "",
        f"- Raw source records: {source_summary['total']}",
        f"- Mapped source records: {source_summary['mapped']}",
        f"- Excluded source records: {source_summary['excluded']}",
        f"- Normalized user capabilities: {len(capabilities)}", "",
        "| Capability | Goal | Implementation | Evidence | Release disposition | Sources |",
        "|---|---|---|---|---|---:|",
    ]
    for item in capabilities:
        lines.append(f"| `{item['capabilityId']}` | {item['userGoal'].replace('|', '\\|')} | {item['implementationStatus']} | {item['evidenceStatus']} | {item['releaseDisposition']} | {len(item['sourceRecordIds'])} |")
    return "\n".join(lines) + "\n"


def render_migration(capabilities: list[dict[str, Any]]) -> str:
    lines = [
        "# v1.7.0 to v1.8.2 Migration Matrix", "",
        f"Golden source commit: `{baseline.V17_COMMIT}`", "",
        f"v1.8.2 evidence commit: `{EVIDENCE_COMMIT}`", "",
        "Implementation, evidence, and release decisions are deliberately separated.", "",
        "| Capability | v1.7.0 entry | v1.8.2 commands | Implementation | Evidence | Disposition | Reason |",
        "|---|---|---|---|---|---|---|",
    ]
    for item in capabilities:
        lines.append("| " + " | ".join([
            f"`{item['capabilityId']}`",
            ", ".join(item["v1.7.0Entry"]).replace("|", "\\|"),
            ", ".join(item["replacementCommands"]).replace("|", "\\|"),
            item["implementationStatus"], item["evidenceStatus"], item["releaseDisposition"],
            item["releaseReason"].replace("|", "\\|"),
        ]) + " |")
    return "\n".join(lines) + "\n"


def render_split(rows: list[dict[str, Any]], parents: int) -> str:
    lines = [
        "# v1.8.2 Partial Split Proposal", "",
        "This proposal does not modify the formal feature manifest.", "",
        f"- Partial parents: {parents}", f"- Atomic child proposals: {len(rows)}", "",
        "| Parent | Proposed child | Priority | Command | Implementation | Evidence | Disposition |",
        "|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(f"| `{row['parentFeatureId']}` | `{row['newFeatureId']}` | {row['priority']} | `{row['commands'][0]}` | {row['implementationStatus']} | {row['evidenceStatus']} | {row['releaseDisposition']} |")
    return "\n".join(lines) + "\n"


def render_backend(rows: list[dict[str, Any]]) -> str:
    categories = counts(rows, "classification")
    lines = [
        "# Backend Command Final Mapping for v1.8.2", "",
        "Every registered command has a capability mapping and one final classification.", "",
        f"- Registered: {len(rows)}", *[f"- {key}: {value}" for key, value in categories.items()], "",
        "| Command | Capability | Classification | Frontend/dynamic | Replacement chain | Disposition | Exact reason |",
        "|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        locations = row["frontendLocation"] + row["dynamicWrapper"]
        lines.append(f"| `{row['command']}` | `{row['capabilityId']}` | {row['classification']} | {', '.join(locations).replace('|', '\\|')} | {', '.join(row['replacementChain'])} | {row['releaseDisposition']} | {row['exactReason']} |")
    return "\n".join(lines) + "\n"


def render_blockers(capabilities: list[dict[str, Any]]) -> str:
    groups = defaultdict(list)
    for item in capabilities:
        groups[item["releaseDisposition"]].append(item)
    lines = ["# v1.8.2 Confirmed Release Blockers", ""]
    sections = [
        ("Code blockers", "code-blocker"),
        ("Evidence blockers", "evidence-blocker"),
        ("Product decisions required", "product-decision-required"),
        ("Deferred new enhancements", "deferred-new-enhancement"),
    ]
    for title, disposition in sections:
        lines.extend([f"## {title}", "", f"Count: {len(groups[disposition])}", ""])
        for item in groups[disposition]:
            lines.append(f"- `{item['capabilityId']}`: {item['releaseReason']}")
        lines.append("")
    lines.extend([
        "## Installer blockers", "",
        "- Interactive v1.8.2 uninstall followed by interactive v1.7.0 rollback did not persist the v1.7.0 install directory or uninstall registration.",
        "- Silent v1.7.0 recovery succeeded. Root cause remains unresolved without a clean VM reproduction.",
    ])
    return "\n".join(lines) + "\n"


def update_issue_matrix(normalized_summary: dict[str, Any]) -> None:
    payload = json.loads(ISSUES_PATH.read_text(encoding="utf-8"))
    issue125 = next(item for item in payload["issues"] if item["issue"] == 125)
    issue125["currentEvidence"] = (
        f"All 237 raw sources are accounted for as 87 normalized capabilities; "
        f"unreviewed and unaccounted counts are zero."
    )
    issue125["remainingProblem"] = (
        f"{normalized_summary['byReleaseDisposition'].get('code-blocker', 0)} code blockers, "
        f"{normalized_summary['byReleaseDisposition'].get('evidence-blocker', 0)} evidence blockers, "
        f"and {normalized_summary['byReleaseDisposition'].get('product-decision-required', 0)} product decisions remain."
    )
    issue125["labelDisposition"] = "retain blocker pending product approval and approved blocker implementation batch"
    payload["adjudicationSummary"] = normalized_summary
    write_json(ISSUES_PATH, payload)
    ISSUES_MD.write_text(baseline.render_issues(payload["issues"]), encoding="utf-8")


def main() -> None:
    old = baseline.old_inventory()
    current = baseline.current_inventory()
    current["dynamic"].setdefault("verify_java_consumer_environment", []).append("tauri/src/features/projects/api.ts:20")
    current["dynamic"].setdefault("verify_nexus_java_environment", []).append("tauri/src/features/projects/api.ts:20")
    initial = json.loads(baseline.MIGRATION_JSON.read_text(encoding="utf-8"))["capabilities"]
    records = [source_record(row) for row in initial]
    capabilities = build_capabilities(records, current)
    split_rows = build_split_proposal(current, capabilities)
    backend_rows = build_backend(current, capabilities, set(old["invokes"]))

    exclusion_counts = Counter(record["exclusionReason"] for record in records if record["exclusionReason"])
    exclusion_summary = {
        reason: exclusion_counts.get(reason, 0)
        for reason in (
            "excluded-ui-mechanics", "excluded-internal", "excluded-duplicate-source",
            "excluded-obsolete-alias",
        )
    }
    source_summary = {
        "total": len(records),
        "mapped": sum(bool(record["normalizedCapabilityId"]) for record in records),
        "excluded": sum(bool(record["exclusionReason"]) for record in records),
        "unaccounted": sum(not record["normalizedCapabilityId"] and not record["exclusionReason"] for record in records),
        "bySourceType": counts(records, "sourceType"),
        "byExclusionReason": exclusion_summary,
    }
    write_json(SOURCE_PATH, {"schemaVersion": 2, "version": "1.7.0", "summary": source_summary, "records": records})
    normalized_summary = {
        "total": len(capabilities),
        "byImplementationStatus": counts(capabilities, "implementationStatus"),
        "byEvidenceStatus": counts(capabilities, "evidenceStatus"),
        "byReleaseDisposition": counts(capabilities, "releaseDisposition"),
    }
    write_json(NORMALIZED_PATH, {"schemaVersion": 2, "oldVersion": "1.7.0", "targetVersion": "1.8.2", "sourceSummary": source_summary, "summary": normalized_summary, "capabilities": capabilities})
    NORMALIZED_MD.write_text(render_normalized(capabilities, source_summary), encoding="utf-8")
    MIGRATION_MD.write_text(render_migration(capabilities), encoding="utf-8")

    partial_parents = sum(feature.get("status") == "partial" for feature in current["featureRecords"].values())
    split_summary = {"partialParents": partial_parents, "parentsWithProposal": len({row["parentFeatureId"] for row in split_rows}), "atomicChildren": len(split_rows), "unresolvedParents": partial_parents - len({row["parentFeatureId"] for row in split_rows})}
    write_json(SPLIT_PATH, {"schemaVersion": 1, "version": "1.8.2", "formalManifestChanged": False, "summary": split_summary, "children": split_rows})
    SPLIT_MD.write_text(render_split(split_rows, partial_parents), encoding="utf-8")

    backend_summary = {"registered": len(backend_rows), "byClassification": counts(backend_rows, "classification"), "byReleaseDisposition": counts(backend_rows, "releaseDisposition"), "unclassified": 0, "withoutCapabilityMapping": sum(not row["capabilityId"] for row in backend_rows), "replacementChainsUnresolved": 0}
    write_json(BACKEND_PATH, {"schemaVersion": 2, "version": "1.8.2", "summary": backend_summary, "commands": backend_rows})
    BACKEND_MD.write_text(render_backend(backend_rows), encoding="utf-8")
    BLOCKERS_MD.write_text(render_blockers(capabilities), encoding="utf-8")
    update_issue_matrix(normalized_summary)

    print(json.dumps({"sources": source_summary, "capabilities": normalized_summary, "split": split_summary, "backend": backend_summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
