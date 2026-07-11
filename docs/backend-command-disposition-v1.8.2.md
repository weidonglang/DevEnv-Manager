# Backend Command Disposition for v1.8.2

This is an initial command-by-command classification. `release-blocker` and `split-required` entries require product adjudication before release; they are not silently allowlisted.

- Registered: 168
- bootstrap: 3
- diagnostic: 7
- dynamic-wrapper: 6
- internal-helper: 4
- legacy-compatible: 10
- user-facing: 138
- disposition deferred-nonblocking: 7
- disposition ready: 109
- disposition release-blocker: 35
- disposition split-required: 17

| Command | Category | User facing | Priority | Frontend | Dynamic | Manifest | Disposition | Exact reason |
|---|---|---:|---|---|---|---|---|---|
| `accept_safety_disclaimer` | user-facing | True | P1 | tauri/src/app/bootstrap.ts:354 |  |  | ready | Direct frontend invoke exists. |
| `add_archive_plan_item` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `analyze_project` | user-facing | True | P1 | tauri/src/features/projects/api.ts:5 |  | projects.analysisAndVerify | ready | Direct frontend invoke exists. |
| `analyze_python_environment` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `app_snapshot` | user-facing | True | P1 | tauri/src/features/dashboard/api.ts:5 |  | nav.dashboard.entry | ready | Direct frontend invoke exists. |
| `apply_config_profile` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `apply_env_repair_plan` | user-facing | True | P0 | tauri/src/features/environment/api.ts:29 |  | environment.doctorAndJava | ready | Direct frontend invoke exists. |
| `apply_file_association_plan` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:28 |  | fileAssociations.planApplyRollback | ready | Direct frontend invoke exists. |
| `apply_java_stabilize_plan` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `apply_managed_python_pip_repair` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `apply_project_configuration` | user-facing | True | P1 | tauri/src/features/projects/api.ts:34 |  | projects.configApply | ready | Direct frontend invoke exists. |
| `apply_python_repair` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `apply_user_environment_configuration` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `cache_entries` | user-facing | True | P1 |  |  | toolchains.gitNodePythonMirrors | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `cancel_maintenance_scan` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `check_for_updates` | user-facing | True | P1 | tauri/src/features/dashboard/api.ts:22, tauri/src/features/settings/api.ts:29 |  | update.checkDownloadMetadata | ready | Direct frontend invoke exists. |
| `clean_dev_cache` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:37 |  |  | ready | Direct frontend invoke exists. |
| `clean_managed_download_cache` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `clean_selected_targets` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:29 |  | cleanup.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `cleanup_path_entries` | user-facing | True | P0 | tauri/src/features/environment/api.ts:33 |  | environment.doctorAndJava | ready | Direct frontend invoke exists. |
| `clear_download_cache` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:33 |  |  | ready | Direct frontend invoke exists. |
| `config_profile_plan_id` | internal-helper | False | P2 |  |  |  | deferred-nonblocking | Supports validation or plan bookkeeping and is not a standalone user operation. |
| `config_profile_requirements` | internal-helper | False | P1 |  |  |  | deferred-nonblocking | Supports validation or plan bookkeeping and is not a standalone user operation. |
| `copy_config_profile` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:41 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `create_c_drive_expansion_plan` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:57 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `create_cleanup_plan` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:25 |  | cleanup.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `create_confirmation_token` | user-facing | True | P1 | tauri/src/core/risk.ts:56 |  |  | ready | Direct frontend invoke exists. |
| `create_desktop_archive_plan` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:85 |  | cleanup.desktopArchive.ui | ready | Direct frontend invoke exists. |
| `create_doctor_repair_plan` | user-facing | True | P0 | tauri/src/features/reports/api.ts:21 |  | doctor.runAndRepair | ready | Direct frontend invoke exists. |
| `create_downloads_archive_plan` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:93 |  | cleanup.downloadsArchive.ui | ready | Direct frontend invoke exists. |
| `create_env_repair_plan` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `create_file_association_plan` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:24 |  | fileAssociations.planApplyRollback | ready | Direct frontend invoke exists. |
| `create_java_stabilize_plan` | user-facing | True | P0 | tauri/src/features/environment/api.ts:25 |  | environment.doctorAndJava | ready | Direct frontend invoke exists. |
| `create_junction_bridge_plan` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `create_managed_python_pip_repair_plan` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `create_move_plan` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:41 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `create_mysql_repair_plan` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:25 |  | toolchains.mysqlRepair | ready | Direct frontend invoke exists. |
| `create_port_resolution_plan` | user-facing | True | P0 | tauri/src/features/ports/api.ts:13 |  | ports.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `create_profile_apply_plan` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:13 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `delete_config_profile` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:33 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `discover_runtimes` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:5 |  | runtime.installed.actions | ready | Direct frontend invoke exists. |
| `doctor_report_text` | user-facing | True | P0 | tauri/src/features/reports/api.ts:17 |  | doctor.runAndRepair | ready | Direct frontend invoke exists. |
| `download_update` | user-facing | True | P1 |  |  | update.checkDownloadMetadata | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `env_snapshot` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `environment_health` | user-facing | True | P0 | tauri/src/features/dashboard/api.ts:9, tauri/src/features/environment/api.ts:9 |  | nav.dashboard.entry, environment.doctorAndJava, environment.pathEvidence | ready | Direct frontend invoke exists. |
| `execute_c_drive_expansion` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:61 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `execute_desktop_archive_plan` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:89 |  | cleanup.desktopArchive.ui | ready | Direct frontend invoke exists. |
| `execute_doctor_repair_plan` | user-facing | True | P0 | tauri/src/features/reports/api.ts:25 |  | doctor.runAndRepair | ready | Direct frontend invoke exists. |
| `execute_downloads_archive_plan` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:97 |  | cleanup.downloadsArchive.ui | ready | Direct frontend invoke exists. |
| `execute_move_plan` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:45 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `execute_mysql_repair_plan` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:29 |  | toolchains.mysqlRepair | ready | Direct frontend invoke exists. |
| `execute_port_resolution_plan` | user-facing | True | P0 | tauri/src/features/ports/api.ts:17 |  | ports.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `execute_profile_apply_plan` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:17 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `export_cleanup_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:41 |  | reports.exports, cleanup.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `export_config_profiles` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:29 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `export_doctor_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:9 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_doctor_report_json` | user-facing | True | P0 | tauri/src/features/reports/api.ts:13 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_env_reliability_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:29 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_file_association_report` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:44, tauri/src/features/reports/api.ts:37 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_port_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:45 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_project_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:49 |  | reports.exports | ready | Direct frontend invoke exists. |
| `export_python_diagnostic_report` | user-facing | True | P0 | tauri/src/features/reports/api.ts:33 |  | reports.exports | ready | Direct frontend invoke exists. |
| `feature_risk_registry` | bootstrap | False | P1 |  |  |  | deferred-nonblocking | Called during startup or the global risk/safety flow; no standalone page button is required. |
| `generate_vscode_config` | legacy-compatible | False | P1 |  |  | projects.configApply | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `get_feature_risk` | bootstrap | False | P2 |  |  |  | deferred-nonblocking | Called during startup or the global risk/safety flow; no standalone page button is required. |
| `import_config_profiles` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:25 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `inspect_agent_traces` | user-facing | True | P1 | tauri/src/features/projects/api.ts:26 |  |  | ready | Direct frontend invoke exists. |
| `inspect_app_usage` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `inspect_command_safety` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:41 |  | nav.commandPalette.entry, toolchains.gitNodePythonMirrors, learning.readOnlyCommandSandbox | ready | Direct frontend invoke exists. |
| `inspect_desktop` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:69 |  | cleanup.cDriveRescue | ready | Direct frontend invoke exists. |
| `inspect_disk_overview` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:17 |  | cleanup.diskOverview.ui | ready | Direct frontend invoke exists. |
| `inspect_downloads` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:73 |  | cleanup.cDriveRescue | ready | Direct frontend invoke exists. |
| `inspect_env_backup` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `inspect_env_reliability` | user-facing | True | P0 | tauri/src/features/environment/api.ts:5 |  | environment.doctorAndJava, environment.pathEvidence | ready | Direct frontend invoke exists. |
| `inspect_idea_project` | user-facing | True | P1 | tauri/src/features/projects/api.ts:17 |  | projects.analysisAndVerify | ready | Direct frontend invoke exists. |
| `inspect_installed_software_usage` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `inspect_java_environment` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `inspect_local_services` | user-facing | True | P0 | tauri/src/features/ports/api.ts:21, tauri/src/features/toolchains/api.ts:17 |  | ports.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `inspect_maintenance_overview` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:13 |  | cleanup.cDriveRescue | ready | Direct frontend invoke exists. |
| `inspect_mysql_repair` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:21 |  | toolchains.mysqlRepair | ready | Direct frontend invoke exists. |
| `inspect_partition_layout` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:53 |  | cleanup.cDriveRescue | ready | Direct frontend invoke exists. |
| `inspect_platform_toolchains` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:9 |  |  | ready | Direct frontend invoke exists. |
| `inspect_project_port_configs` | user-facing | True | P1 | tauri/src/features/projects/api.ts:13 |  | projects.analysisAndVerify | ready | Direct frontend invoke exists. |
| `inspect_python_integrity` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `inspect_runtime_strong_verification` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:13 |  | runtime.installed.actions | ready | Direct frontend invoke exists. |
| `inspect_system_platforms` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:13 |  |  | ready | Direct frontend invoke exists. |
| `inspect_toolchains` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:5 |  |  | ready | Direct frontend invoke exists. |
| `install_go` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/events.ts, tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `install_gradle_latest` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/api.ts, tauri/src/features/runtimes/events.ts, tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `install_jdk` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `install_maven_latest` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `install_node` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `install_python` | dynamic-wrapper | True | P0 |  | tauri/src/features/runtimes/events.ts | runtime.install.groups | ready | Recognized dynamic runtime wrapper supplies this command. |
| `jdk_distributions` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:9 |  | runtime.install.groups | ready | Direct frontend invoke exists. |
| `kill_process` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `launch_update_installer` | user-facing | True | P1 |  |  | update.checkDownloadMetadata | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `list_archive_plan_items` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `list_config_profiles` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:5 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `list_env_backups` | user-facing | True | P1 | tauri/src/features/environment/api.ts:17 |  |  | ready | Direct frontend invoke exists. |
| `list_environment_backups` | user-facing | True | P1 | tauri/src/features/environment/api.ts:21 |  |  | ready | Direct frontend invoke exists. |
| `list_file_association_backups` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:16 |  | fileAssociations.planApplyRollback | ready | Direct frontend invoke exists. |
| `list_rollback_records` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:65 |  |  | ready | Direct frontend invoke exists. |
| `load_config` | user-facing | True | P1 | tauri/src/app/bootstrap.ts:334, tauri/src/features/settings/api.ts:5 |  | settings.themeLanguageSafety | ready | Direct frontend invoke exists. |
| `local_service_logs` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `manage_local_service` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:33 |  |  | ready | Direct frontend invoke exists. |
| `manage_system_platform` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:37 |  |  | ready | Direct frontend invoke exists. |
| `mysql_pending_execution_guard` | internal-helper | False | P1 |  |  | toolchains.mysqlRepair | deferred-nonblocking | Supports validation or plan bookkeeping and is not a standalone user operation. |
| `network_diagnostics` | user-facing | True | P1 |  |  | toolchains.gitNodePythonMirrors | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `open_analysis_path` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:101, tauri/src/features/reports/api.ts:53, tauri/src/features/runtimes/api.ts:29 |  | runtime.installed.actions, reports.exports, cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `open_app_config_dir` | user-facing | True | P1 | tauri/src/features/settings/api.ts:17 |  | settings.themeLanguageSafety | ready | Direct frontend invoke exists. |
| `open_apps_features` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:33 |  | runtime.installed.actions | ready | Direct frontend invoke exists. |
| `open_default_apps_settings` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:36 |  | fileAssociations.scanSearchRows | ready | Direct frontend invoke exists. |
| `open_docker_desktop` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `open_file_association_backup_dir` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `open_file_type_settings` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:40 |  | fileAssociations.scanSearchRows | ready | Direct frontend invoke exists. |
| `open_local_service_directory` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `open_process_location` | user-facing | True | P0 | tauri/src/features/ports/api.ts:29 |  | ports.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `open_python_alias_settings` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `port_history` | user-facing | True | P0 | tauri/src/features/ports/api.ts:9 |  | ports.scanTableAndReasons | ready | Direct frontend invoke exists. |
| `powershell_runner_status` | user-facing | True | P1 | tauri/src/features/dashboard/api.ts:13, tauri/src/features/settings/api.ts:25 |  | nav.dashboard.entry, debug.panelAndExport | ready | Direct frontend invoke exists. |
| `preview_config_profiles` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:21 |  |  | ready | Direct frontend invoke exists. |
| `preview_project_configuration` | user-facing | True | P1 | tauri/src/features/projects/api.ts:9 |  | projects.configApply | ready | Direct frontend invoke exists. |
| `preview_python_repair` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `preview_user_environment_configuration` | user-facing | True | P0 | tauri/src/features/environment/api.ts:13 |  | environment.doctorAndJava | ready | Direct frontend invoke exists. |
| `project_health` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `remove_archive_plan_item` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `rename_config_profile` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:37 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `repair_maven_gradle_registration` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `reset_ui_config` | user-facing | True | P1 | tauri/src/features/settings/api.ts:21 |  | settings.themeLanguageSafety | ready | Direct frontend invoke exists. |
| `restore_env_backup` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `restore_environment_backup` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `restore_user_environment` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `rollback_env_repair` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `rollback_file_association_backup` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:32 |  | fileAssociations.planApplyRollback | ready | Direct frontend invoke exists. |
| `rollback_move` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:49 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `run_chsrc_action` | user-facing | True | P1 |  |  | toolchains.gitNodePythonMirrors | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `run_doctor` | user-facing | True | P0 | tauri/src/features/reports/api.ts:5 |  | doctor.runAndRepair | ready | Direct frontend invoke exists. |
| `run_learning_check` | user-facing | True | P1 | tauri/src/features/toolchains/api.ts:45 |  |  | ready | Direct frontend invoke exists. |
| `run_platform_action` | user-facing | True | P1 |  |  | toolchains.gitNodePythonMirrors | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `run_project_action` | user-facing | True | P1 | tauri/src/features/projects/api.ts:30 |  |  | ready | Direct frontend invoke exists. |
| `run_tool_command` | user-facing | True | P1 |  |  | learning.readOnlyCommandSandbox | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `run_toolchain_action` | user-facing | True | P1 |  |  | toolchains.gitNodePythonMirrors | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `safety_disclaimer` | bootstrap | False | P1 |  |  |  | deferred-nonblocking | Called during startup or the global risk/safety flow; no standalone page button is required. |
| `save_config_profile` | user-facing | True | P1 | tauri/src/features/profiles/api.ts:9 |  | profiles.crudImportExportApply | ready | Direct frontend invoke exists. |
| `scan_cleanup_targets` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:21 |  | cleanup.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `scan_duplicate_large_files` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:81 |  | cleanup.duplicateLargeFiles.ui | ready | Direct frontend invoke exists. |
| `scan_file_associations` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:12 |  | fileAssociations.scanSearchRows | ready | Direct frontend invoke exists. |
| `scan_large_files` | user-facing | True | P1 | tauri/src/features/cleanup/api.ts:77 |  | cleanup.moveExpansionLargeFiles | ready | Direct frontend invoke exists. |
| `scan_ports` | user-facing | True | P0 | tauri/src/features/dashboard/api.ts:26, tauri/src/features/ports/api.ts:5 |  | nav.dashboard.entry, ports.scanTableAndReasons | ready | Direct frontend invoke exists. |
| `scan_storage_cleanup` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `search_file_association_app` | user-facing | True | P0 | tauri/src/features/fileAssociations/api.ts:20 |  | fileAssociations.scanSearchRows | ready | Direct frontend invoke exists. |
| `self_uninstall` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `set_auto_check_update` | user-facing | True | P1 | tauri/src/features/settings/api.ts:13 |  | settings.themeLanguageSafety | ready | Direct frontend invoke exists. |
| `set_root_dir` | user-facing | True | P1 | tauri/src/features/settings/api.ts:9 |  | settings.themeLanguageSafety | ready | Direct frontend invoke exists. |
| `stop_local_service` | user-facing | True | P0 | tauri/src/features/ports/api.ts:25 |  | ports.planExecuteAndVerify | ready | Direct frontend invoke exists. |
| `storage_cleanup_architecture` | user-facing | True | P0 | tauri/src/features/cleanup/api.ts:9 |  | cleanup.cDriveRescue | ready | Direct frontend invoke exists. |
| `switch_runtime` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:21 |  | runtime.installed.actions | ready | Direct frontend invoke exists. |
| `uninstall_external_runtime` | legacy-compatible | False | P2 |  |  |  | split-required | Registered command has no current invoke and no v1.7.0 frontend invoke match; compatibility or obsolescence requires owner confirmation. |
| `uninstall_runtime` | user-facing | True | P0 | tauri/src/features/runtimes/api.ts:25 |  | runtime.installed.actions | ready | Direct frontend invoke exists. |
| `update_project_port` | user-facing | True | P1 | tauri/src/features/projects/api.ts:38 |  |  | ready | Direct frontend invoke exists. |
| `validate_directory_path` | internal-helper | False | P1 |  |  |  | deferred-nonblocking | Supports validation or plan bookkeeping and is not a standalone user operation. |
| `verify_env_after_apply` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `verify_external_jdk` | user-facing | True | P1 |  |  |  | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `verify_java_consumer_environment` | user-facing | True | P1 |  |  | projects.analysisAndVerify | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
| `verify_java_toolchain` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `verify_maven_gradle_with_current_jdk` | diagnostic | False | P2 |  |  |  | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `verify_nacos_java_environment` | diagnostic | False | P1 |  |  | projects.analysisAndVerify | split-required | Read-only evidence command; current direct user entry was not identified and indirect coverage needs confirmation. |
| `verify_nexus_java_environment` | user-facing | True | P1 |  |  | projects.analysisAndVerify | release-blocker | v1.7.0 frontend invoked this command, but no current exact/dynamic invoke was found. |
