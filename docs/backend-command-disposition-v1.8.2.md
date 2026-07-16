# Backend Command Final Mapping for v1.8.2

Every registered command has a capability mapping and one final classification.

- Registered: 170
- bootstrap: 3
- compatibility-alias: 18
- diagnostic: 6
- direct-user-command: 120
- dynamic-user-command: 7
- internal-helper: 4
- replacement-command: 12

| Command | Capability | Classification | Frontend/dynamic | Replacement chain | Disposition | Exact reason |
|---|---|---|---|---|---|---|
| `accept_safety_disclaimer` | `safety.disclaimer` | direct-user-command | tauri/src/app/bootstrap.ts:354 |  | ready | A current frontend invoke exposes this command. |
| `add_archive_plan_item` | `cleanup.archive-plan` | direct-user-command | tauri/src/features/cleanup/api.ts:117 |  | ready | A current frontend invoke exposes this command. |
| `analyze_project` | `projects.analysis` | direct-user-command | tauri/src/features/projects/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `analyze_python_environment` | `environment.python-health-repair` | direct-user-command | tauri/src/features/environment/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `app_snapshot` | `dashboard.snapshot` | direct-user-command | tauri/src/features/dashboard/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `apply_config_profile` | `profiles.apply` | compatibility-alias |  | create_profile_apply_plan, execute_profile_apply_plan | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `apply_env_repair_plan` | `environment.java-stabilize` | replacement-command | tauri/src/features/environment/api.ts:61 | apply_java_stabilize_plan | ready | This command participates in an explicit old-to-new replacement chain. |
| `apply_file_association_plan` | `file-associations.apply` | direct-user-command | tauri/src/features/fileAssociations/api.ts:28 |  | ready | A current frontend invoke exposes this command. |
| `apply_java_stabilize_plan` | `legacy-environment.java-stabilize-plan` | compatibility-alias |  | create_java_stabilize_plan, apply_env_repair_plan | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `apply_managed_python_pip_repair` | `environment.python-health-repair` | compatibility-alias |  | analyze_python_environment, apply_python_repair, preview_python_repair | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `apply_project_configuration` | `projects.configuration` | direct-user-command | tauri/src/features/projects/api.ts:34 |  | ready | A current frontend invoke exposes this command. |
| `apply_python_repair` | `environment.python-health-repair` | direct-user-command | tauri/src/features/environment/api.ts:49 |  | ready | A current frontend invoke exposes this command. |
| `apply_user_environment_configuration` | `environment.configure` | replacement-command | tauri/src/features/environment/api.ts:17 | configure_user_environment | ready | This command participates in an explicit old-to-new replacement chain. |
| `cache_entries` | `toolchains.network-cache` | direct-user-command | tauri/src/features/toolchains/api.ts:77 |  | ready | A current frontend invoke exposes this command. |
| `cancel_maintenance_scan` | `cleanup.scan-plan-execute` | compatibility-alias |  | clean_selected_targets, create_cleanup_plan, scan_cleanup_targets | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `check_for_updates` | `update.check` | direct-user-command | tauri/src/features/dashboard/api.ts:22, tauri/src/features/settings/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `clean_dev_cache` | `cleanup.dev-cache` | direct-user-command | tauri/src/features/cleanup/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `clean_managed_download_cache` | `cleanup.download-cache` | compatibility-alias |  | clear_download_cache | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `clean_selected_targets` | `cleanup.scan-plan-execute` | direct-user-command | tauri/src/features/cleanup/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `cleanup_path_entries` | `environment.path-cleanup` | direct-user-command | tauri/src/features/environment/api.ts:65 |  | ready | A current frontend invoke exposes this command. |
| `clear_download_cache` | `cleanup.download-cache` | direct-user-command | tauri/src/features/cleanup/api.ts:33, tauri/src/features/toolchains/api.ts:81 |  | ready | A current frontend invoke exposes this command. |
| `config_profile_plan_id` | `legacy-profiles.config-profile-plan-id` | internal-helper |  |  | ready | This command supports validation or plan bookkeeping and is not a standalone user goal. |
| `config_profile_requirements` | `profiles.preview` | internal-helper |  |  | ready | This command supports validation or plan bookkeeping and is not a standalone user goal. |
| `copy_config_profile` | `legacy-profiles.copy-config-profile` | direct-user-command | tauri/src/features/profiles/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `create_c_drive_expansion_plan` | `cleanup.partition-expansion` | direct-user-command | tauri/src/features/cleanup/api.ts:57 |  | ready | A current frontend invoke exposes this command. |
| `create_cleanup_plan` | `cleanup.scan-plan-execute` | direct-user-command | tauri/src/features/cleanup/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `create_confirmation_token` | `safety.risk-confirmation` | direct-user-command | tauri/src/core/risk.ts:56 |  | ready | A current frontend invoke exposes this command. |
| `create_desktop_archive_plan` | `cleanup.desktop-archive` | direct-user-command | tauri/src/features/cleanup/api.ts:85 |  | ready | A current frontend invoke exposes this command. |
| `create_doctor_repair_plan` | `doctor.repair` | replacement-command | tauri/src/features/reports/api.ts:21 | repair_doctor_safe | ready | This command participates in an explicit old-to-new replacement chain. |
| `create_downloads_archive_plan` | `cleanup.downloads-archive` | direct-user-command | tauri/src/features/cleanup/api.ts:93 |  | ready | A current frontend invoke exposes this command. |
| `create_env_repair_plan` | `environment.java-stabilize` | compatibility-alias |  | apply_env_repair_plan, create_java_stabilize_plan | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `create_file_association_plan` | `file-associations.apply` | direct-user-command | tauri/src/features/fileAssociations/api.ts:24 |  | ready | A current frontend invoke exposes this command. |
| `create_generic_archive_plan` | `cleanup.archive-plan` | direct-user-command | tauri/src/features/cleanup/api.ts:125 |  | ready | A current frontend invoke exposes this command. |
| `create_java_stabilize_plan` | `environment.java-stabilize` | replacement-command | tauri/src/features/environment/api.ts:57 | apply_java_stabilize_plan | ready | This command participates in an explicit old-to-new replacement chain. |
| `create_junction_bridge_plan` | `cleanup.move-rollback` | compatibility-alias |  | create_move_plan, execute_move_plan, list_rollback_records, rollback_move | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `create_managed_python_pip_repair_plan` | `environment.python-health-repair` | compatibility-alias |  | analyze_python_environment, apply_python_repair, preview_python_repair | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `create_move_plan` | `cleanup.move-rollback` | direct-user-command | tauri/src/features/cleanup/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `create_mysql_repair_plan` | `mysql.repair` | direct-user-command | tauri/src/features/toolchains/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `create_port_resolution_plan` | `ports.release` | direct-user-command | tauri/src/features/ports/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `create_profile_apply_plan` | `profiles.apply` | replacement-command | tauri/src/features/profiles/api.ts:13 | apply_config_profile, install_profile_missing | ready | This command participates in an explicit old-to-new replacement chain. |
| `delete_config_profile` | `profiles.delete` | direct-user-command | tauri/src/features/profiles/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `discover_runtimes` | `runtime.discover` | direct-user-command | tauri/src/features/runtimes/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `doctor_report_text` | `doctor.run` | direct-user-command | tauri/src/features/reports/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `download_update` | `update.download-install` | direct-user-command | tauri/src/features/settings/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `env_snapshot` | `environment.snapshot` | compatibility-alias |  | environment_health, inspect_env_reliability | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `environment_health` | `environment.snapshot` | direct-user-command | tauri/src/features/dashboard/api.ts:9, tauri/src/features/environment/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `execute_c_drive_expansion` | `cleanup.partition-expansion` | direct-user-command | tauri/src/features/cleanup/api.ts:61 |  | ready | A current frontend invoke exposes this command. |
| `execute_desktop_archive_plan` | `cleanup.desktop-archive` | direct-user-command | tauri/src/features/cleanup/api.ts:89 |  | ready | A current frontend invoke exposes this command. |
| `execute_doctor_repair_plan` | `doctor.repair` | replacement-command | tauri/src/features/reports/api.ts:25 | repair_doctor_safe | ready | This command participates in an explicit old-to-new replacement chain. |
| `execute_downloads_archive_plan` | `cleanup.downloads-archive` | direct-user-command | tauri/src/features/cleanup/api.ts:97 |  | ready | A current frontend invoke exposes this command. |
| `execute_generic_archive_plan` | `cleanup.archive-plan` | direct-user-command | tauri/src/features/cleanup/api.ts:129 |  | ready | A current frontend invoke exposes this command. |
| `execute_move_plan` | `cleanup.move-rollback` | direct-user-command | tauri/src/features/cleanup/api.ts:45 |  | ready | A current frontend invoke exposes this command. |
| `execute_mysql_repair_plan` | `mysql.repair` | direct-user-command | tauri/src/features/toolchains/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `execute_port_resolution_plan` | `ports.release` | direct-user-command | tauri/src/features/ports/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `execute_profile_apply_plan` | `profiles.apply` | replacement-command | tauri/src/features/profiles/api.ts:17 | apply_config_profile, install_profile_missing | ready | This command participates in an explicit old-to-new replacement chain. |
| `export_cleanup_report` | `reports.export` | direct-user-command | tauri/src/features/reports/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `export_config_profiles` | `profiles.import-export` | direct-user-command | tauri/src/features/profiles/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `export_doctor_report` | `doctor.report` | direct-user-command | tauri/src/features/reports/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `export_doctor_report_json` | `doctor.report` | direct-user-command | tauri/src/features/reports/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `export_env_reliability_report` | `reports.export` | direct-user-command | tauri/src/features/reports/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `export_file_association_report` | `reports.export` | direct-user-command | tauri/src/features/fileAssociations/api.ts:44, tauri/src/features/reports/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `export_port_report` | `reports.export` | direct-user-command | tauri/src/features/reports/api.ts:45 |  | ready | A current frontend invoke exposes this command. |
| `export_project_report` | `reports.export` | direct-user-command | tauri/src/features/reports/api.ts:49 |  | ready | A current frontend invoke exposes this command. |
| `export_python_diagnostic_report` | `reports.export` | direct-user-command | tauri/src/features/reports/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `feature_risk_registry` | `safety.risk-confirmation` | bootstrap |  |  | ready | This command belongs to application startup or global safety initialization. |
| `generate_vscode_config` | `projects.configuration` | compatibility-alias |  | apply_project_configuration, preview_project_configuration | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `get_feature_risk` | `safety.risk-confirmation` | bootstrap |  |  | ready | This command belongs to application startup or global safety initialization. |
| `import_config_profiles` | `profiles.import-export` | direct-user-command | tauri/src/features/profiles/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `inspect_agent_traces` | `debug.agent-traces` | direct-user-command | tauri/src/features/projects/api.ts:26 |  | ready | A current frontend invoke exposes this command. |
| `inspect_app_usage` | `cleanup.application-usage` | direct-user-command | tauri/src/features/cleanup/api.ts:105 |  | ready | A current frontend invoke exposes this command. |
| `inspect_command_safety` | `toolchains.command-safety` | replacement-command | tauri/src/features/toolchains/api.ts:85 | run_tool_command | ready | This command participates in an explicit old-to-new replacement chain. |
| `inspect_desktop` | `cleanup.folder-analysis` | direct-user-command | tauri/src/features/cleanup/api.ts:69 |  | ready | A current frontend invoke exposes this command. |
| `inspect_disk_overview` | `legacy-cleanup.disk-overview` | direct-user-command | tauri/src/features/cleanup/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `inspect_downloads` | `cleanup.folder-analysis` | direct-user-command | tauri/src/features/cleanup/api.ts:73 |  | ready | A current frontend invoke exposes this command. |
| `inspect_env_backup` | `environment.backups` | direct-user-command | tauri/src/features/environment/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `inspect_env_reliability` | `environment.snapshot` | direct-user-command | tauri/src/features/environment/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `inspect_idea_project` | `projects.idea-analysis` | direct-user-command | tauri/src/features/projects/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `inspect_installed_software_usage` | `cleanup.application-usage` | direct-user-command | tauri/src/features/cleanup/api.ts:109 |  | ready | A current frontend invoke exposes this command. |
| `inspect_java_environment` | `environment.snapshot` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `inspect_local_services` | `services.inspect` | direct-user-command | tauri/src/features/ports/api.ts:21, tauri/src/features/toolchains/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `inspect_maintenance_overview` | `cleanup.overview` | direct-user-command | tauri/src/features/cleanup/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `inspect_mysql_repair` | `mysql.repair` | direct-user-command | tauri/src/features/toolchains/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `inspect_partition_layout` | `cleanup.partition-expansion` | direct-user-command | tauri/src/features/cleanup/api.ts:53 |  | ready | A current frontend invoke exposes this command. |
| `inspect_platform_toolchains` | `platforms.inspect` | direct-user-command | tauri/src/features/toolchains/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `inspect_project_port_configs` | `projects.port-config` | direct-user-command | tauri/src/features/projects/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `inspect_python_integrity` | `environment.python-health-repair` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `inspect_runtime_strong_verification` | `runtime.verify` | direct-user-command | tauri/src/features/runtimes/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `inspect_system_platforms` | `platforms.inspect` | direct-user-command | tauri/src/features/toolchains/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `inspect_toolchains` | `toolchains.inspect` | direct-user-command | tauri/src/features/toolchains/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `install_go` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/events.ts, tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `install_gradle_latest` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/api.ts, tauri/src/features/runtimes/events.ts, tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `install_jdk` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `install_maven_latest` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `install_node` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `install_python` | `runtime.install` | dynamic-user-command | tauri/src/features/runtimes/events.ts |  | ready | A recognized dynamic invoke wrapper exposes this command. |
| `jdk_distributions` | `runtime.discover` | direct-user-command | tauri/src/features/runtimes/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `kill_process` | `ports.release` | compatibility-alias |  | create_port_resolution_plan, execute_port_resolution_plan | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `launch_update_installer` | `update.download-install` | direct-user-command | tauri/src/features/settings/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `list_archive_plan_items` | `cleanup.archive-plan` | direct-user-command | tauri/src/features/cleanup/api.ts:113 |  | ready | A current frontend invoke exposes this command. |
| `list_config_profiles` | `profiles.list` | direct-user-command | tauri/src/features/profiles/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `list_env_backups` | `environment.backups` | direct-user-command | tauri/src/features/environment/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `list_environment_backups` | `environment.backups` | direct-user-command | tauri/src/features/environment/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `list_file_association_backups` | `file-associations.backup-rollback` | direct-user-command | tauri/src/features/fileAssociations/api.ts:16 |  | ready | A current frontend invoke exposes this command. |
| `list_rollback_records` | `cleanup.move-rollback` | direct-user-command | tauri/src/features/cleanup/api.ts:65 |  | ready | A current frontend invoke exposes this command. |
| `load_config` | `settings.load` | direct-user-command | tauri/src/app/bootstrap.ts:334, tauri/src/features/settings/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `local_service_logs` | `services.logs` | direct-user-command | tauri/src/features/toolchains/api.ts:49 |  | ready | A current frontend invoke exposes this command. |
| `manage_local_service` | `services.manage` | direct-user-command | tauri/src/features/toolchains/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `manage_system_platform` | `platforms.manage` | direct-user-command | tauri/src/features/toolchains/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `mysql_pending_execution_guard` | `mysql.repair` | direct-user-command | tauri/src/features/toolchains/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `network_diagnostics` | `toolchains.network-cache` | direct-user-command | tauri/src/features/toolchains/api.ts:73 |  | ready | A current frontend invoke exposes this command. |
| `open_analysis_path` | `system.open-path` | direct-user-command | tauri/src/features/cleanup/api.ts:101, tauri/src/features/reports/api.ts:53, tauri/src/features/runtimes/api.ts:29, tauri/src/features/toolchains/api.ts:57 |  | ready | A current frontend invoke exposes this command. |
| `open_app_config_dir` | `settings.config-directory` | direct-user-command | tauri/src/features/settings/api.ts:17 |  | ready | A current frontend invoke exposes this command. |
| `open_apps_features` | `system.apps-features` | direct-user-command | tauri/src/features/runtimes/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `open_default_apps_settings` | `file-associations.settings` | direct-user-command | tauri/src/features/fileAssociations/api.ts:36 |  | ready | A current frontend invoke exposes this command. |
| `open_docker_desktop` | `platforms.docker` | direct-user-command | tauri/src/features/toolchains/api.ts:45 |  | ready | A current frontend invoke exposes this command. |
| `open_file_association_backup_dir` | `file-associations.backup-rollback` | compatibility-alias |  | list_file_association_backups, rollback_file_association_backup | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `open_file_type_settings` | `file-associations.settings` | direct-user-command | tauri/src/features/fileAssociations/api.ts:40 |  | ready | A current frontend invoke exposes this command. |
| `open_local_service_directory` | `services.directory` | direct-user-command | tauri/src/features/toolchains/api.ts:53 |  | ready | A current frontend invoke exposes this command. |
| `open_process_location` | `ports.process-location` | direct-user-command | tauri/src/features/ports/api.ts:29 |  | ready | A current frontend invoke exposes this command. |
| `open_python_alias_settings` | `environment.python-alias-settings` | direct-user-command | tauri/src/features/environment/api.ts:53 |  | ready | A current frontend invoke exposes this command. |
| `port_history` | `ports.scan-history` | direct-user-command | tauri/src/features/ports/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `powershell_runner_status` | `legacy-workbench.powershell-runner-status` | direct-user-command | tauri/src/features/dashboard/api.ts:13, tauri/src/features/settings/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `preview_config_profiles` | `profiles.preview` | direct-user-command | tauri/src/features/profiles/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `preview_project_configuration` | `projects.configuration` | direct-user-command | tauri/src/features/projects/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `preview_python_repair` | `environment.python-health-repair` | direct-user-command | tauri/src/features/environment/api.ts:45 |  | ready | A current frontend invoke exposes this command. |
| `preview_user_environment_configuration` | `environment.configure` | replacement-command | tauri/src/features/environment/api.ts:13 | configure_user_environment | ready | This command participates in an explicit old-to-new replacement chain. |
| `project_health` | `projects.analysis` | compatibility-alias |  | analyze_project | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `remove_archive_plan_item` | `cleanup.archive-plan` | direct-user-command | tauri/src/features/cleanup/api.ts:121 |  | ready | A current frontend invoke exposes this command. |
| `rename_config_profile` | `legacy-profiles.rename-config-profile` | direct-user-command | tauri/src/features/profiles/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `repair_maven_gradle_registration` | `legacy-workbench.repair-maven-gradle-registration` | internal-helper |  |  | ready | This command supports validation or plan bookkeeping and is not a standalone user goal. |
| `reset_ui_config` | `settings.reset-ui` | direct-user-command | tauri/src/features/settings/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `restore_env_backup` | `environment.restore` | direct-user-command | tauri/src/features/environment/api.ts:33 |  | ready | A current frontend invoke exposes this command. |
| `restore_environment_backup` | `environment.restore` | replacement-command | tauri/src/features/environment/api.ts:37 | restore_user_environment | ready | This command participates in an explicit old-to-new replacement chain. |
| `restore_user_environment` | `environment.restore` | compatibility-alias |  | restore_environment_backup | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `rollback_env_repair` | `environment.java-stabilize` | compatibility-alias |  | apply_env_repair_plan, create_java_stabilize_plan | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `rollback_file_association_backup` | `file-associations.backup-rollback` | direct-user-command | tauri/src/features/fileAssociations/api.ts:32 |  | ready | A current frontend invoke exposes this command. |
| `rollback_move` | `cleanup.move-rollback` | direct-user-command | tauri/src/features/cleanup/api.ts:49 |  | ready | A current frontend invoke exposes this command. |
| `run_chsrc_action` | `toolchains.mirrors` | direct-user-command | tauri/src/features/toolchains/api.ts:69 |  | ready | A current frontend invoke exposes this command. |
| `run_doctor` | `doctor.run` | direct-user-command | tauri/src/features/reports/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `run_learning_check` | `learning.center` | replacement-command | tauri/src/features/toolchains/api.ts:89 | run_tool_command | ready | This command participates in an explicit old-to-new replacement chain. |
| `run_platform_action` | `platforms.manage` | direct-user-command | tauri/src/features/toolchains/api.ts:65 |  | ready | A current frontend invoke exposes this command. |
| `run_project_action` | `projects.actions` | direct-user-command | tauri/src/features/projects/api.ts:30 |  | ready | A current frontend invoke exposes this command. |
| `run_tool_command` | `toolchains.command-safety` | compatibility-alias |  | inspect_command_safety, run_learning_check | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `run_toolchain_action` | `toolchains.actions` | direct-user-command | tauri/src/features/toolchains/api.ts:61 |  | ready | A current frontend invoke exposes this command. |
| `safety_disclaimer` | `safety.disclaimer` | bootstrap |  |  | ready | This command belongs to application startup or global safety initialization. |
| `save_config_profile` | `profiles.save` | direct-user-command | tauri/src/features/profiles/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `scan_cleanup_targets` | `cleanup.scan-plan-execute` | direct-user-command | tauri/src/features/cleanup/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `scan_duplicate_large_files` | `cleanup.folder-analysis` | direct-user-command | tauri/src/features/cleanup/api.ts:81 |  | ready | A current frontend invoke exposes this command. |
| `scan_file_associations` | `file-associations.scan` | direct-user-command | tauri/src/features/fileAssociations/api.ts:12 |  | ready | A current frontend invoke exposes this command. |
| `scan_large_files` | `cleanup.folder-analysis` | direct-user-command | tauri/src/features/cleanup/api.ts:77 |  | ready | A current frontend invoke exposes this command. |
| `scan_ports` | `ports.scan-history` | direct-user-command | tauri/src/features/dashboard/api.ts:26, tauri/src/features/ports/api.ts:5 |  | ready | A current frontend invoke exposes this command. |
| `scan_storage_cleanup` | `cleanup.scan-plan-execute` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `search_file_association_app` | `legacy-file-associations.search-file-association-app` | direct-user-command | tauri/src/features/fileAssociations/api.ts:20 |  | ready | A current frontend invoke exposes this command. |
| `self_uninstall` | `system.self-uninstall` | direct-user-command | tauri/src/features/settings/api.ts:41 |  | ready | A current frontend invoke exposes this command. |
| `set_auto_check_update` | `settings.auto-update` | direct-user-command | tauri/src/features/settings/api.ts:13 |  | ready | A current frontend invoke exposes this command. |
| `set_root_dir` | `settings.root` | direct-user-command | tauri/src/features/settings/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `stop_local_service` | `services.manage` | direct-user-command | tauri/src/features/ports/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `storage_cleanup_architecture` | `cleanup.overview` | direct-user-command | tauri/src/features/cleanup/api.ts:9 |  | ready | A current frontend invoke exposes this command. |
| `switch_runtime` | `runtime.switch` | direct-user-command | tauri/src/features/runtimes/api.ts:21 |  | ready | A current frontend invoke exposes this command. |
| `uninstall_external_runtime` | `runtime.uninstall` | compatibility-alias |  | uninstall_runtime | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `uninstall_runtime` | `runtime.uninstall` | direct-user-command | tauri/src/features/runtimes/api.ts:25 |  | ready | A current frontend invoke exposes this command. |
| `update_project_port` | `projects.port-config` | direct-user-command | tauri/src/features/projects/api.ts:38 |  | ready | A current frontend invoke exposes this command. |
| `validate_directory_path` | `settings.root` | internal-helper |  |  | ready | This command supports validation or plan bookkeeping and is not a standalone user goal. |
| `verify_env_after_apply` | `environment.java-stabilize` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `verify_external_jdk` | `runtime.external-jdk-verify` | direct-user-command | tauri/src/features/runtimes/api.ts:37 |  | ready | A current frontend invoke exposes this command. |
| `verify_java_consumer_environment` | `projects.java-consumer-verify` | replacement-command | tauri/src/features/projects/api.ts:20 | verify_nacos_java_environment | ready | This command participates in an explicit old-to-new replacement chain. |
| `verify_java_toolchain` | `runtime.verify` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `verify_maven_gradle_with_current_jdk` | `runtime.verify` | diagnostic |  |  | ready | This read-only command supplies evidence to a broader user flow. |
| `verify_nacos_java_environment` | `projects.java-consumer-verify` | compatibility-alias |  | verify_java_consumer_environment | ready | The v1.7.0 command remains registered without a current direct entry; compatibility ownership requires approval. |
| `verify_nexus_java_environment` | `projects.java-consumer-verify` | dynamic-user-command | tauri/src/features/projects/api.ts:20 |  | ready | A recognized dynamic invoke wrapper exposes this command. |
