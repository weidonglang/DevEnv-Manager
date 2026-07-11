from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
V17_COMMIT = "55f4a6cfc2d91582f20566b813d4706af4ef8d4a"
CURRENT_EVIDENCE_COMMIT = "2f05525b0b685f1386c271849415987c6fde05f3"
MANIFEST_PATH = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
MIGRATION_JSON = ROOT / "acceptance" / "v1.7.0-capability-matrix.json"
MIGRATION_MD = ROOT / "docs" / "v1.7.0-to-v1.8.2-migration-matrix.md"
PARTIAL_JSON = ROOT / "acceptance" / "release-dispositions.v1.8.2.json"
PARTIAL_MD = ROOT / "docs" / "partial-release-dispositions-v1.8.2.md"
BACKEND_JSON = ROOT / "acceptance" / "backend-command-disposition.v1.8.2.json"
BACKEND_MD = ROOT / "docs" / "backend-command-disposition-v1.8.2.md"
ISSUES_JSON = ROOT / "acceptance" / "issues-125-128-blocker-matrix.json"
ISSUES_MD = ROOT / "docs" / "issues-125-128-blocker-matrix.md"

INTERACTIVE_NSIS_RESULT = {
    "testedOn": "2026-07-12",
    "startingVersion": "1.7.0",
    "upgradeTo182": "passed",
    "configurationRetainedAfterUpgrade": True,
    "profileCountAfterUpgrade": 1,
    "v182Launch": "passed",
    "v182Uninstall": "passed",
    "interactiveRollbackTo170": "failed",
    "rollbackFailure": (
        "After the interactive rollback launched v1.7.0, the install directory and uninstall "
        "registration were absent. A retry through Add/Reinstall reproduced the same state."
    ),
    "silentRecoveryTo170": "passed",
    "finalInstalledVersion": "1.7.0",
    "finalAppRunning": False,
    "finalSettingsSize": 950,
    "finalSettingsSha256": "8fd1d16130effb597ea451b0f93beb344b4e496bec98e51e5c118028dc3c2235",
    "finalProfileCount": 1,
    "releaseDisposition": "release-blocker",
    "releaseReason": "The required interactive uninstall and rollback round trip did not complete successfully.",
}

INVOKE_RE = re.compile(r"\binvoke(?:<[^>]+>)?\s*\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
DYNAMIC_COMMAND_RE = re.compile(
    r"\b(?:installRuntime|installWithRisk|installLatestWithRisk)\s*\([^)]*[\"'`](install_[A-Za-z0-9_]+)[\"'`]",
    re.DOTALL,
)
HANDLER_RE = re.compile(r"generate_handler!\s*\[(?P<body>.*?)\]\s*\)", re.DOTALL)
IDENT_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
ACTION_RE = re.compile(r"data-action=[\"']([^\"']+)[\"']")
VIEW_RE = re.compile(r"data-view=[\"']([^\"']+)[\"']")

ROUTE_MAP = {
    "overview": ("dashboard", "Dashboard"),
    "doctor": ("reports", "Reports / Doctor"),
    "ports": ("ports", "Ports & Services"),
    "runtimes": ("runtimes", "Runtimes"),
    "environment": ("environment", "Environment"),
    "project": ("projects", "Projects"),
    "toolchains": ("toolchains", "Toolchains"),
    "platforms": ("toolchains", "Toolchains / Platforms"),
    "learning": ("toolchains", "Toolchains / Learning"),
    "maintenance": ("cleanup", "Cleanup"),
    "toolbox": ("fileAssociations/toolchains/settings/reports", "Split Workbench entries"),
}

COMMAND_ALIASES = {
    "configure_user_environment": ["preview_user_environment_configuration", "apply_user_environment_configuration"],
    "repair_doctor_safe": ["create_doctor_repair_plan", "execute_doctor_repair_plan"],
    "apply_config_profile": ["create_profile_apply_plan", "execute_profile_apply_plan"],
    "install_profile_missing": ["create_profile_apply_plan", "execute_profile_apply_plan"],
    "restore_user_environment": ["restore_environment_backup"],
}

INSTALLED_VERIFIED_COMMANDS = {
    "load_config",
    "check_for_updates",
    "powershell_runner_status",
    "inspect_disk_overview",
    "scan_duplicate_large_files",
    "create_desktop_archive_plan",
    "create_downloads_archive_plan",
    "scan_cleanup_targets",
    "create_cleanup_plan",
    "scan_ports",
    "create_port_resolution_plan",
    "execute_port_resolution_plan",
    "run_doctor",
    "create_doctor_repair_plan",
    "export_doctor_report",
    "export_doctor_report_json",
    "inspect_env_reliability",
    "create_java_stabilize_plan",
    "scan_file_associations",
    "search_file_association_app",
    "create_file_association_plan",
    "list_config_profiles",
}

BOOTSTRAP_COMMANDS = {
    "accept_safety_disclaimer",
    "safety_disclaimer",
    "load_config",
    "create_confirmation_token",
    "feature_risk_registry",
    "get_feature_risk",
}

INTERNAL_HELPERS = {
    "config_profile_plan_id",
    "config_profile_requirements",
    "mysql_pending_execution_guard",
    "validate_directory_path",
}

ISSUES = [
    {
        "issue": 125,
        "title": "旧功能完整性核查",
        "state": "OPEN",
        "labels": ["hotfix", "regression", "tracking", "blocker", "audit"],
        "uncheckedItems": None,
        "currentEvidence": "This migration matrix is the first structured replacement for the long checklist.",
        "remainingProblem": "Migration completeness has not yet reached mapped=total with zero missing/degraded/deferred/unreviewed.",
        "blocksV182": True,
        "labelDisposition": "retain blocker pending product adjudication",
        "followUpIssue": "#125",
    },
    {
        "issue": 126,
        "title": "Risk、toast、Debug",
        "state": "OPEN",
        "labels": ["bug", "hotfix", "frontend", "blocker", "debugging", "risk-ux"],
        "uncheckedItems": 100,
        "currentEvidence": "Toast-only, risk, debug, and durable-result automated gates pass for declared P0 coverage.",
        "remainingProblem": "The issue checklist has not been reconciled with installed-app evidence or explicitly deferred scope.",
        "blocksV182": True,
        "labelDisposition": "retain blocker pending issue comment and checklist mapping",
        "followUpIssue": "#126",
    },
    {
        "issue": 127,
        "title": "搜索、导航、C 盘急救",
        "state": "OPEN",
        "labels": ["bug", "hotfix", "frontend", "regression", "blocker", "navigation"],
        "uncheckedItems": 57,
        "currentEvidence": "Installed smoke covers Cleanup plans and page switching; frontend quality checks pass.",
        "remainingProblem": "The full search/navigation/cleanup checklist has no per-item release disposition.",
        "blocksV182": True,
        "labelDisposition": "retain blocker pending issue comment and checklist mapping",
        "followUpIssue": "#127",
    },
    {
        "issue": 128,
        "title": "Debug、token/plan mismatch、多运行时",
        "state": "OPEN",
        "labels": ["hotfix", "regression", "blocker", "debugging", "risk-ux", "runtime"],
        "uncheckedItems": 156,
        "currentEvidence": "Token/plan contracts and Debug timeline checks pass for declared coverage; Runtime redesign remains #130.",
        "remainingProblem": "Runtime sub-capabilities and legacy command mappings are not individually adjudicated.",
        "blocksV182": True,
        "labelDisposition": "retain blocker pending split and product adjudication",
        "followUpIssue": "#128 / #130",
    },
]


def run(*args: str) -> str:
    result = subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    return result.stdout


def git_show(commit: str, path: str) -> str:
    return run("git", "show", f"{commit}:{path}")


def git_files(commit: str, prefix: str, suffix: str) -> list[str]:
    files = run("git", "ls-tree", "-r", "--name-only", commit).splitlines()
    return [path for path in files if path.startswith(prefix) and path.endswith(suffix)]


def current_ts_files() -> list[Path]:
    return sorted((ROOT / "tauri" / "src").rglob("*.ts"))


def line_locations(text: str, pattern: re.Pattern[str], path: str) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for number, line in enumerate(text.splitlines(), 1):
        for match in pattern.finditer(line):
            found.setdefault(match.group(1), []).append(f"{path}:{number}")
    return found


def merge_locations(target: dict[str, list[str]], incoming: dict[str, list[str]]) -> None:
    for key, values in incoming.items():
        target.setdefault(key, []).extend(values)


def domain_for_command(command: str) -> str:
    checks = [
        (("port", "process"), "Ports"),
        (("cleanup", "archive", "disk", "desktop", "downloads", "large_file", "duplicate", "move", "partition", "expansion", "junction", "app_usage", "installed_software"), "Cleanup"),
        (("file_association", "default_apps", "file_type"), "File Associations"),
        (("profile",), "Profiles"),
        (("doctor",), "Doctor / Reports"),
        (("report",), "Reports"),
        (("environment", "env_", "java_stabilize", "path_entries", "python_repair", "python_integrity", "java_environment", "external_jdk"), "Environment"),
        (("runtime", "install_jdk", "install_node", "install_python", "install_go", "install_maven", "install_gradle", "jdk_distribution"), "Runtimes"),
        (("project", "idea", "nacos", "nexus", "vscode"), "Projects"),
        (("toolchain", "chsrc", "platform", "local_service", "mysql", "docker", "wsl", "network", "cache"), "Toolchains"),
        (("update",), "Update"),
        (("safety", "confirmation_token", "feature_risk"), "Safety"),
        (("config", "root_dir", "auto_check", "ui_config", "app_config"), "Settings"),
    ]
    for needles, domain in checks:
        if any(needle in command for needle in needles):
            return domain
    return "Workbench"


def page_for_domain(domain: str) -> str:
    return {
        "Ports": "ports",
        "Cleanup": "cleanup",
        "File Associations": "fileAssociations",
        "Profiles": "profiles",
        "Doctor / Reports": "reports",
        "Reports": "reports",
        "Environment": "environment",
        "Runtimes": "runtimes",
        "Projects": "projects",
        "Toolchains": "toolchains",
        "Update": "settings",
        "Safety": "settings",
        "Settings": "settings",
    }.get(domain, "dashboard")


def risk_for(command: str) -> str:
    if command.startswith(("execute_", "apply_", "restore_", "rollback_", "kill_", "clean_", "uninstall_", "manage_", "stop_", "self_uninstall")):
        return "high"
    if command.startswith(("install_", "switch_", "set_", "update_", "run_", "repair_", "clear_")):
        return "medium"
    return "readOnly"


def pretty(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").strip().title()


def current_inventory() -> dict[str, Any]:
    direct: dict[str, list[str]] = {}
    dynamic: dict[str, list[str]] = {}
    current_text: dict[str, str] = {}
    for path in current_ts_files():
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        current_text[rel] = text
        merge_locations(direct, line_locations(text, INVOKE_RE, rel))
        for command in DYNAMIC_COMMAND_RE.findall(text):
            dynamic.setdefault(command, []).append(rel)
    lib_path = ROOT / "tauri" / "src-tauri" / "src" / "lib.rs"
    lib_text = lib_path.read_text(encoding="utf-8")
    registered: set[str] = set()
    for match in HANDLER_RE.finditer(lib_text):
        registered.update(IDENT_RE.findall(match.group("body")))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    command_features: dict[str, list[str]] = {}
    feature_records: dict[str, dict[str, Any]] = {}
    for page in manifest.get("pages", []):
        for feature in page.get("features", []):
            record = {**feature, "pageId": page.get("pageId"), "pagePriority": page.get("priority")}
            feature_records[feature["featureId"]] = record
            for command in feature.get("backendCommands", []):
                command_features.setdefault(command, []).append(feature["featureId"])
    allowlist = {item["command"]: item for item in manifest.get("commandAllowlist", [])}
    return {
        "direct": direct,
        "dynamic": dynamic,
        "registered": registered,
        "texts": current_text,
        "manifest": manifest,
        "commandFeatures": command_features,
        "featureRecords": feature_records,
        "allowlist": allowlist,
    }


def old_inventory() -> dict[str, Any]:
    invokes: dict[str, list[str]] = {}
    actions: dict[str, list[str]] = {}
    views: dict[str, list[str]] = {}
    for rel in git_files(V17_COMMIT, "tauri/src/", ".ts"):
        text = git_show(V17_COMMIT, rel)
        merge_locations(invokes, line_locations(text, INVOKE_RE, rel))
        merge_locations(actions, line_locations(text, ACTION_RE, rel))
        merge_locations(views, line_locations(text, VIEW_RE, rel))
    readme = git_show(V17_COMMIT, "README.md")
    promise_section = readme.split("## Tauri/Rust 重构版能力", 1)[1].split("## 使用流程", 1)[0]
    promises = [line[2:].strip() for line in promise_section.splitlines() if line.startswith("- ")]
    return {"invokes": invokes, "actions": actions, "views": views, "promises": promises}


def command_mapping(command: str, current: dict[str, Any]) -> tuple[list[str], list[str], str, str]:
    direct = current["direct"]
    dynamic = current["dynamic"]
    registered = current["registered"]
    if command in direct:
        return [command], direct[command], "equivalent", "Exact frontend invoke remains present."
    if command in dynamic:
        return [command], dynamic[command], "equivalent", "Command is called through a recognized dynamic runtime wrapper."
    aliases = COMMAND_ALIASES.get(command, [])
    alias_locations = [location for alias in aliases for location in direct.get(alias, []) + dynamic.get(alias, [])]
    if aliases and all(alias in registered for alias in aliases) and alias_locations:
        return aliases, alias_locations, "enhanced", f"Replaced by explicit plan/result flow: {', '.join(aliases)}."
    if command in registered:
        return [command], [], "degraded", "Backend command remains registered but no exact or recognized dynamic frontend invoke was found."
    return aliases, alias_locations, "missing", "No current registered command or approved replacement was found."


def evidence_for(commands: list[str], current: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    automated: list[str] = []
    installed: list[str] = []
    real: list[str] = []
    for command in commands:
        features = current["commandFeatures"].get(command, [])
        if features:
            automated.append(f"feature-manifest:{','.join(features)}")
        if command in INSTALLED_VERIFIED_COMMANDS:
            installed.append(f"installed-v1.8.2:{command}")
            real.append(f"real-tauri-windows:{command}")
    return sorted(set(automated)), sorted(set(real)), sorted(set(installed))


def release_for(status: str, risk: str, real_evidence: list[str]) -> tuple[str, str]:
    if status in {"missing", "degraded"}:
        return "release-blocker", f"Old user capability is {status}; product adjudication or restoration is required."
    if status in {"unreviewed"}:
        return "split-required", "Evidence sources were captured, but an explicit product mapping is still required."
    if risk in {"high", "medium"} and not real_evidence:
        return "release-blocker", "State-changing historical capability lacks installed real-Tauri evidence."
    return "ready", "Current mapping and available evidence preserve the historical capability."


def base_capability(feature_id: str, name: str, domain: str, source: str) -> dict[str, Any]:
    return {
        "oldFeatureId": feature_id,
        "oldFeatureName": name,
        "oldDomain": domain,
        "oldVersionPage": page_for_domain(domain),
        "oldVersionEntry": source,
        "oldUserSteps": [f"Open {page_for_domain(domain)}", f"Use {name}"],
        "oldFrontendComponent": [],
        "oldBackendCommands": [],
        "oldOutputOrSystemEffect": "Captured from v1.7.0 user-visible source evidence.",
        "oldRiskLevel": "readOnly",
        "oldSafetyFlow": {"plan": False, "token": False, "backup": False, "rollback": False},
        "currentPage": "",
        "currentEntry": "",
        "currentFrontendComponent": [],
        "currentBackendCommands": [],
        "currentUserSteps": [],
        "migrationStatus": "unreviewed",
        "difference": "Requires explicit product adjudication.",
        "automatedEvidence": [],
        "realTauriEvidence": [],
        "installedAppEvidence": [],
        "upgradeEvidence": [
            "interactive-v1.7.0-to-v1.8.2-upgrade-passed",
            "interactive-v1.8.2-uninstall-passed",
            "interactive-v1.7.0-rollback-failed",
            "silent-v1.7.0-recovery-passed",
        ],
        "lastVerifiedCommit": CURRENT_EVIDENCE_COMMIT,
        "releaseDisposition": "split-required",
        "releaseReason": "Evidence captured; migration decision not yet approved.",
        "followUpIssue": "#125",
        "sourceEvidence": [source],
    }


def build_migration(old: dict[str, Any], current: dict[str, Any]) -> list[dict[str, Any]]:
    capabilities: list[dict[str, Any]] = []
    for view, locations in sorted(old["views"].items()):
        route, label = ROUTE_MAP.get(view, ("", ""))
        item = base_capability(f"v17.page.{view}", f"Open {pretty(view)} page", "Workbench", "installed/source page")
        item["oldVersionPage"] = view
        item["oldVersionEntry"] = f"navigation:{view}"
        item["oldFrontendComponent"] = locations
        item["currentPage"] = route
        item["currentEntry"] = label
        item["currentUserSteps"] = [f"Open {label}"] if label else []
        item["migrationStatus"] = "enhanced" if view == "toolbox" else ("equivalent" if route else "missing")
        item["difference"] = "Toolbox capabilities were split into first-class Workbench pages." if view == "toolbox" else "Navigation route mapped by release comparison."
        item["automatedEvidence"] = [f"route-map:{view}->{route}"] if route else []
        item["installedAppEvidence"] = ["installed-v1.7.0-page-observed", "installed-v1.8.2-page-observed"]
        item["realTauriEvidence"] = ["real-tauri-navigation-smoke"]
        item["releaseDisposition"], item["releaseReason"] = release_for(item["migrationStatus"], "readOnly", item["realTauriEvidence"])
        capabilities.append(item)

    all_current_source = "\n".join(current["texts"].values())
    for action, locations in sorted(old["actions"].items()):
        domain = "Workbench"
        item = base_capability(f"v17.action.{action}", pretty(action), domain, "v1.7.0 frontend action")
        item["oldVersionEntry"] = f"data-action={action}"
        item["oldFrontendComponent"] = locations
        present = bool(re.search(rf"[\"'`]{re.escape(action)}[\"'`]", all_current_source))
        item["currentEntry"] = action if present else ""
        item["currentFrontendComponent"] = [path for path, text in current["texts"].items() if action in text]
        item["migrationStatus"] = "equivalent" if present else "unreviewed"
        item["difference"] = "Exact action identifier remains in current frontend." if present else "Action identifier changed or capability requires command-level mapping."
        item["automatedEvidence"] = ["current-source-action-match"] if present else []
        item["releaseDisposition"], item["releaseReason"] = release_for(item["migrationStatus"], "readOnly", [])
        capabilities.append(item)

    for command, locations in sorted(old["invokes"].items()):
        domain = domain_for_command(command)
        mapped_commands, current_locations, status, difference = command_mapping(command, current)
        risk = risk_for(command)
        automated, real, installed = evidence_for(mapped_commands or [command], current)
        item = base_capability(f"v17.command.{command}", pretty(command), domain, "v1.7.0 frontend invoke")
        item["oldVersionEntry"] = command
        item["oldFrontendComponent"] = locations
        item["oldBackendCommands"] = [command]
        item["oldRiskLevel"] = risk
        item["oldSafetyFlow"] = {
            "plan": any(token in command for token in ("plan", "preview", "apply", "execute", "repair", "restore", "rollback")),
            "token": risk in {"high", "medium"},
            "backup": any(token in command for token in ("apply", "restore", "rollback", "clean", "move", "association", "environment")),
            "rollback": any(token in command for token in ("restore", "rollback", "apply", "move", "association", "environment")),
        }
        item["currentPage"] = page_for_domain(domain)
        item["currentEntry"] = mapped_commands[0] if mapped_commands else ""
        item["currentFrontendComponent"] = current_locations
        item["currentBackendCommands"] = mapped_commands
        item["currentUserSteps"] = [f"Open {item['currentPage']}", f"Invoke {mapped_commands[0]}"] if mapped_commands else []
        item["migrationStatus"] = status
        item["difference"] = difference
        item["automatedEvidence"] = automated
        item["realTauriEvidence"] = real
        item["installedAppEvidence"] = installed
        item["releaseDisposition"], item["releaseReason"] = release_for(status, risk, real)
        capabilities.append(item)

    for index, promise in enumerate(old["promises"], 1):
        item = base_capability(f"v17.promise.{index:03d}", promise, "Published capability", "v1.7.0 README")
        item["oldVersionEntry"] = "README capability promise"
        item["sourceEvidence"] = [f"README.md:{promise}"]
        capabilities.append(item)
    return capabilities


def build_partial_dispositions(old: dict[str, Any], current: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    old_commands = set(old["invokes"])
    installed_features = {
        feature
        for command in INSTALLED_VERIFIED_COMMANDS
        for feature in current["commandFeatures"].get(command, [])
    }
    for feature_id, feature in sorted(current["featureRecords"].items()):
        if feature.get("status") != "partial":
            continue
        commands = feature.get("backendCommands", [])
        priority = feature.get("priority") or feature.get("pagePriority") or "P2"
        old_feature = bool(old_commands.intersection(commands))
        broad = len(commands) > 3 or feature_id in {"runtime.install.groups", "runtime.installed.actions"}
        evidence = [f"feature-manifest:{feature_id}"]
        if feature_id in installed_features:
            evidence.append("installed-app-targeted-smoke")
        disposition = "split-required" if broad or old_feature else "deferred-nonblocking"
        reason = (
            "Feature aggregates multiple historical capabilities; split before ready/blocker adjudication."
            if disposition == "split-required"
            else "No v1.7.0 command overlap was found; product owner must confirm this is a new enhancement."
        )
        rows.append(
            {
                "featureId": feature_id,
                "priority": priority,
                "targetVersion": "v1.8.2",
                "oldFeature": old_feature,
                "currentStatus": "partial",
                "currentEntry": feature.get("frontendEntry", {}),
                "backendCommands": commands,
                "completedContent": feature.get("acceptanceChecks", []),
                "unfinishedContent": feature.get("manualOnlyReason") or "Exact remaining sub-capabilities are not adjudicated.",
                "userImpact": "Cannot claim complete old-feature migration until sub-capabilities are split and evidenced.",
                "affectsStartup": False,
                "affectsSafety": any(risk_for(command) in {"high", "medium"} for command in commands),
                "affectsData": any(risk_for(command) == "high" for command in commands),
                "affectsOldCoreCapability": old_feature,
                "automatedEvidence": evidence,
                "realTauriEvidence": ["targeted-real-tauri-smoke"] if feature_id in installed_features else [],
                "installedAppEvidence": ["targeted-installed-app-smoke"] if feature_id in installed_features else [],
                "releaseDisposition": disposition,
                "releaseReason": reason,
                "followUpIssue": "#130" if feature_id.startswith("runtime.") else "#125",
            }
        )
    return rows


def backend_category(command: str, old_invokes: set[str], current: dict[str, Any]) -> tuple[str, bool, str, str]:
    if command in current["direct"]:
        return "user-facing", True, "Direct frontend invoke exists.", "ready"
    if command in current["dynamic"]:
        return "dynamic-wrapper", True, "Recognized dynamic runtime wrapper supplies this command.", "ready"
    if command in BOOTSTRAP_COMMANDS:
        return "bootstrap", False, "Called during startup or the global risk/safety flow; no standalone page button is required.", "deferred-nonblocking"
    if command in INTERNAL_HELPERS:
        return "internal-helper", False, "Supports validation or plan bookkeeping and is not a standalone user operation.", "deferred-nonblocking"
    if command in old_invokes:
        return "user-facing", True, "v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found.", "release-blocker"
    if command.startswith(("inspect_", "scan_", "discover_", "verify_", "list_", "env_snapshot", "app_snapshot", "environment_health", "port_history", "doctor_report")):
        return "diagnostic", False, "Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation.", "split-required"
    return "legacy-compatible", False, "Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation.", "split-required"


def build_backend_dispositions(old: dict[str, Any], current: dict[str, Any]) -> list[dict[str, Any]]:
    old_invokes = set(old["invokes"])
    rows: list[dict[str, Any]] = []
    for command in sorted(current["registered"]):
        category, user_facing, reason, disposition = backend_category(command, old_invokes, current)
        features = current["commandFeatures"].get(command, [])
        priority = "P2"
        if features:
            priorities = [
                current["featureRecords"][feature].get("priority")
                or current["featureRecords"][feature].get("pagePriority")
                or "P2"
                for feature in features
            ]
            priority = "P0" if "P0" in priorities else ("P1" if "P1" in priorities else "P2")
        elif command in old_invokes:
            priority = "P1"
        frontend = current["direct"].get(command, [])
        dynamic = current["dynamic"].get(command, [])
        allow = current["allowlist"].get(command)
        rows.append(
            {
                "command": command,
                "registeredLocation": "tauri/src-tauri/src/lib.rs:generate_handler",
                "frontendInvokeLocation": frontend,
                "dynamicInvokeLocation": dynamic,
                "manifestFeatureId": features,
                "userFacing": user_facing,
                "priority": priority,
                "category": category,
                "indirectlyCoveredBy": features,
                "testEvidence": [f"feature-manifest:{feature}" for feature in features],
                "releaseDisposition": disposition,
                "reason": reason,
                "followUpIssue": "#125" if disposition != "ready" else None,
                "allowlist": allow,
            }
        )
    return rows


def summary(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    return dict(sorted(Counter(str(row.get(key)) for row in rows).items()))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def md_escape(value: Any) -> str:
    return str(value if value is not None else "").replace("|", "\\|").replace("\n", " ")


def render_migration(rows: list[dict[str, Any]]) -> str:
    counts = summary(rows, "migrationStatus")
    dispositions = summary(rows, "releaseDisposition")
    lines = [
        "# v1.7.0 to v1.8.2 Capability Migration Matrix",
        "",
        f"Golden source commit: `{V17_COMMIT}`",
        f"Evidence baseline commit: `{CURRENT_EVIDENCE_COMMIT}`",
        "",
        "This inventory is generated from v1.7.0 installed/source page routes, frontend action ids, frontend invokes, and README capability promises. It is an adjudication input, not a claim of migration completeness.",
        "",
        "## Interactive NSIS result",
        "",
        "- v1.7.0 -> v1.8.2 interactive upgrade: passed",
        "- v1.8.2 launch and configuration retention: passed",
        "- v1.8.2 uninstall: passed",
        "- Interactive rollback to v1.7.0: failed (installed files and uninstall registration did not persist)",
        "- Silent recovery to v1.7.0: passed",
        "- Release disposition: `release-blocker`",
        "",
        "## Summary",
        "",
        f"- Total capabilities: {len(rows)}",
        *[f"- {key}: {value}" for key, value in counts.items()],
        *[f"- disposition {key}: {value}" for key, value in dispositions.items()],
        "",
        "## Matrix",
        "",
        "| Old feature | Domain | Source | Current mapping | Status | Disposition | Reason |",
        "|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                md_escape(value)
                for value in (
                    row["oldFeatureId"],
                    row["oldDomain"],
                    row["oldVersionEntry"],
                    row["currentEntry"],
                    row["migrationStatus"],
                    row["releaseDisposition"],
                    row["releaseReason"],
                )
            )
            + " |"
        )
    return "\n".join(lines) + "\n"


def render_partial(rows: list[dict[str, Any]]) -> str:
    lines = [
        "# v1.8.2 Partial Feature Release Dispositions",
        "",
        "No manifest status is changed by this document. Broad features are marked `split-required` until their sub-capabilities are adjudicated.",
        "",
        f"- P0 partial: {sum(row['priority'] == 'P0' for row in rows)}",
        f"- P1 partial: {sum(row['priority'] == 'P1' for row in rows)}",
        f"- Total: {len(rows)}",
        "",
        "| Feature | Priority | Old feature | Commands | Evidence | Disposition | Reason | Follow-up |",
        "|---|---|---:|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(
            f"| `{row['featureId']}` | {row['priority']} | {row['oldFeature']} | {md_escape(', '.join(row['backendCommands']))} | {md_escape(', '.join(row['automatedEvidence']))} | {row['releaseDisposition']} | {md_escape(row['releaseReason'])} | {row['followUpIssue']} |"
        )
    return "\n".join(lines) + "\n"


def render_backend(rows: list[dict[str, Any]]) -> str:
    categories = summary(rows, "category")
    dispositions = summary(rows, "releaseDisposition")
    lines = [
        "# Backend Command Disposition for v1.8.2",
        "",
        "This is an initial command-by-command classification. `release-blocker` and `split-required` entries require product adjudication before release; they are not silently allowlisted.",
        "",
        f"- Registered: {len(rows)}",
        *[f"- {key}: {value}" for key, value in categories.items()],
        *[f"- disposition {key}: {value}" for key, value in dispositions.items()],
        "",
        "| Command | Category | User facing | Priority | Frontend | Dynamic | Manifest | Disposition | Exact reason |",
        "|---|---|---:|---|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(
            f"| `{row['command']}` | {row['category']} | {row['userFacing']} | {row['priority']} | {md_escape(', '.join(row['frontendInvokeLocation']))} | {md_escape(', '.join(row['dynamicInvokeLocation']))} | {md_escape(', '.join(row['manifestFeatureId']))} | {row['releaseDisposition']} | {md_escape(row['reason'])} |"
        )
    return "\n".join(lines) + "\n"


def render_issues(rows: list[dict[str, Any]]) -> str:
    lines = [
        "# Issues #125-#128 Release Blocker Matrix",
        "",
        "No issue is closed and no blocker label is removed in this evidence phase.",
        "",
        "| Issue | State | Unchecked | Current evidence | Remaining problem | Blocks v1.8.2 | Label disposition |",
        "|---|---|---:|---|---|---:|---|",
    ]
    for row in rows:
        lines.append(
            f"| [#{row['issue']}](https://github.com/weidonglang/DevEnv-Manager/issues/{row['issue']}) | {row['state']} | {row['uncheckedItems'] if row['uncheckedItems'] is not None else 'not normalized'} | {md_escape(row['currentEvidence'])} | {md_escape(row['remainingProblem'])} | {row['blocksV182']} | {md_escape(row['labelDisposition'])} |"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    old = old_inventory()
    current = current_inventory()
    migration = build_migration(old, current)
    partials = build_partial_dispositions(old, current)
    backend = build_backend_dispositions(old, current)

    migration_payload = {
        "schemaVersion": 1,
        "oldVersion": "1.7.0",
        "oldCommit": V17_COMMIT,
        "oldInstaller": "DevEnv.Manager_1.7.0_x64-setup.exe",
        "oldInstallerSha256": "6b88d7ca812770ca032ff331c4f0916b1ec7282eb9cdf6cea0c32dc79d3ab711",
        "evidenceCommit": CURRENT_EVIDENCE_COMMIT,
        "interactiveNsis": INTERACTIVE_NSIS_RESULT,
        "sourceCounts": {
            "pages": len(old["views"]),
            "actions": len(old["actions"]),
            "frontendInvokes": len(old["invokes"]),
            "readmePromises": len(old["promises"]),
        },
        "summary": {"total": len(migration), "byMigrationStatus": summary(migration, "migrationStatus"), "byReleaseDisposition": summary(migration, "releaseDisposition")},
        "capabilities": migration,
    }
    write_json(MIGRATION_JSON, migration_payload)
    MIGRATION_MD.write_text(render_migration(migration), encoding="utf-8")

    write_json(
        PARTIAL_JSON,
        {"schemaVersion": 1, "version": "1.8.2", "summary": {"total": len(partials), "byPriority": summary(partials, "priority"), "byDisposition": summary(partials, "releaseDisposition")}, "features": partials},
    )
    PARTIAL_MD.write_text(render_partial(partials), encoding="utf-8")

    write_json(
        BACKEND_JSON,
        {"schemaVersion": 1, "version": "1.8.2", "summary": {"registered": len(backend), "byCategory": summary(backend, "category"), "byDisposition": summary(backend, "releaseDisposition")}, "commands": backend},
    )
    BACKEND_MD.write_text(render_backend(backend), encoding="utf-8")

    write_json(
        ISSUES_JSON,
        {"schemaVersion": 1, "version": "1.8.2", "summary": {"issues": len(ISSUES), "remainingBlockerLabels": sum("blocker" in row["labels"] for row in ISSUES)}, "issues": ISSUES},
    )
    ISSUES_MD.write_text(render_issues(ISSUES), encoding="utf-8")

    print(json.dumps({"migration": migration_payload["summary"], "partials": summary(partials, "releaseDisposition"), "backend": {"registered": len(backend), "categories": summary(backend, "category"), "dispositions": summary(backend, "releaseDisposition")}, "issues": len(ISSUES)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
