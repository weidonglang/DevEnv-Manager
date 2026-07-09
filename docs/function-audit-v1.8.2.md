# DevEnv Manager Function Audit Matrix

Scope: v1.8.2 / v1.9.0 planning after v1.8.1 freeze. This matrix is intentionally conservative: a feature is marked partial when the UI exists but old-version parity, feedback, verification, rollback, reporting, or smoke coverage is incomplete.

## Status Legend

- Complete: entry, backend command, feedback, error state, and verification/reporting are present for the intended scope.
- Partial: useful implementation exists, but workflow completeness or old-version parity is not yet sufficient.
- Entry only: visible entry exists, but execution path is incomplete or not enough to trust.
- Missing: no current workbench entry.
- Deferred: intentionally moved to v1.9.0 or later.

## Function Audit Matrix

| Domain | Function | Old Version Status | Current Entry | Frontend / Backend | Current Status | Main Gaps | Target | Priority | Repair Plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Runtime | JDK install/discover/switch/uninstall | Existing core feature | Runtimes | `features/runtimes`; `install_jdk`, `switch_runtime`, `uninstall_runtime` | Partial | Grouping, plan details, verification display, and full managed/external separation need v1.9.0 pass | v1.9.0 | P1 | Move to #130 runtime refactor; keep v1.8.2 fixes limited to feedback/readability |
| Runtime | Python multi-version install/switch/uninstall | Existing core feature | Runtimes | `install_python`, `switch_runtime`, `uninstall_runtime` | Partial | Version source is static; Python integrity/pip repair not unified in Runtime page | v1.9.0 | P1 | Runtime grouping and per-kind verification module |
| Runtime | Node.js multi-version install/switch/uninstall | Existing core feature | Runtimes | `install_node`, `switch_runtime`, `uninstall_runtime` | Partial | npm/corepack/pnpm/yarn ecosystem not presented as a complete Runtime flow | v1.9.0 | P1 | Fold toolchain evidence into Runtime verification |
| Runtime | Go install/switch/uninstall | Existing core feature | Runtimes | `install_go`, `switch_runtime`, `uninstall_runtime` | Partial | GOPROXY/GOROOT/GOPATH evidence is split into Toolchains | v1.9.0 | P1 | Runtime refactor with per-kind detail panels |
| Runtime | Maven / Gradle install and current pointer | Existing core feature | Runtimes | `install_maven_latest`, `install_gradle_latest` | Partial | Only latest install UI; multi-version selection and JVM match flow incomplete | v1.9.0 | P1 | Add version selectors and JVM verification model |
| Runtime | Rust / Cargo / rustup | Existing diagnostic feature | Toolchains | `inspect_platform_toolchains` | Partial | No Runtime page grouping or switch/update workflow | v1.9.0 | P2 | Keep read-only in v1.8.2; design v1.9.0 runtime grouping |
| Runtime | .NET SDK | Existing diagnostic feature | Toolchains / Projects | `inspect_platform_toolchains`, `analyze_project` | Partial | No dedicated Runtime card; no download/system entry | v1.9.0 | P2 | Read-only detail first, managed install later only if scoped |
| Environment | Environment check | Existing core feature | Environment | `inspect_env_reliability`, `environment_health` | Partial | Feedback exists; reports still need clearer persistent evidence and suggestions | v1.8.2 | P0 | Strengthen result area, audit raw DTO labels, improve export handoff |
| Environment | Java stabilize plan | Existing core feature | Environment | `create_java_stabilize_plan`, `apply_env_repair_plan` | Partial | Only current JAVA_HOME dropdown; manual picker still weak | v1.8.2 | P0 | Add directory picker or clear selection workflow |
| Environment | PATH cleanup | Existing core feature | Environment | `cleanup_path_entries` | Partial | Needs clearer duplicate/missing/stale/store/path-too-long grouping in UI | v1.8.2 | P1 | Expand adapter rows and report details |
| Doctor | Run doctor | Existing core feature | Reports | `run_doctor` | Partial | No independent Doctor page; report persistence is session-scoped | v1.8.2 | P1 | Persist last doctor report and improve evidence display |
| Doctor | Repair recommendations | Existing planned feature | Backend has plan/execution | `create_doctor_repair_plan`, `execute_doctor_repair_plan` | Entry gap | No visible workbench flow for doctor repair plan | v1.8.2 | P1 | Add report-side plan preview before execution |
| Ports | Scan/search/filter/pagination | Existing core feature | Ports | `scan_ports`, `port_history` | Partial | Search fixed; needs smoke coverage and owner-changed retry polish | v1.8.2 | P0 | Add automated action/input checks and clearer retry state |
| Ports | Port resolution plan | Existing core feature | Ports | `create_port_resolution_plan`, `execute_port_resolution_plan` | Partial | Low-risk lightweight close path not implemented; owner re-check UX still limited | v1.8.2 | P1 | Add rescan-and-retry and plan detail evidence |
| Projects | Choose/analyze project | Existing core feature | Projects | `analyze_project`, Tauri dialog picker | Partial | Recent project persistence and clearer cancelled/failed state need work | v1.8.2 | P0 | Persist recent paths and keep selected path visible |
| Projects | IDEA inspect / Java consumer verify | Existing core feature | Projects | `inspect_idea_project`, `verify_java_consumer_environment` | Partial | Results render, but labels and evidence density need polish | v1.8.2 | P1 | Localize result sections and add evidence tables |
| Projects | Project configuration apply | Existing core feature | Projects | `preview_project_configuration`, `apply_project_configuration` | Partial | Plan/diff exists; rollback/report not yet first-class | v1.8.2 | P1 | Add backup/result area and report export |
| Cleanup | C drive rescue | Existing core feature | Cleanup | `inspect_maintenance_overview`, `inspect_partition_layout` | Partial | Disk overview exists; old Phase 2/3/4 parity incomplete | v1.8.2 | P0 | Restore visible disk overview, safety rules, reports, and action feedback |
| Cleanup | Desktop/downloads analysis | Existing core feature | Cleanup | `inspect_desktop`, `inspect_downloads` | Partial | Read-only summaries exist inside C rescue; dedicated workflow and pagination incomplete | v1.8.2 | P1 | Add sections with open/copy actions and paging |
| Cleanup | Large files | Existing core feature | Cleanup | `scan_large_files`, `open_analysis_path` | Partial | Open/copy present; multi-drive and duplicate workflow incomplete | v1.8.2 | P1 | Add multi-root options and duplicate scan entry |
| Cleanup | Move/Junction/archive/rollback | Existing core feature | Cleanup | `create_move_plan`, `execute_move_plan`, `rollback_move` | Partial | Source/target selection is placeholder-like; archive plan commands not surfaced | v1.8.2 | P1 | Add source/target pickers and explicit archive entries |
| Toolchains | Git/Node/Python/platform checks | Existing core feature | Toolchains | `inspect_toolchains`, `inspect_platform_toolchains` | Partial | Feedback exists; action buttons for ecosystem tools are not fully surfaced | v1.8.2 | P1 | Expand detail cards and per-action result areas |
| Toolchains | Docker/WSL/local services | Existing core feature | Toolchains / Ports | `inspect_system_platforms`, `inspect_local_services` | Partial | System management is guarded but UI is dense and not task-specific | v1.8.2 | P2 | Keep guarded; improve explanatory details |
| Toolchains | MySQL repair | Existing core feature | Toolchains | `inspect_mysql_repair`, `create_mysql_repair_plan`, `execute_mysql_repair_plan` | Partial | Requires clearer backup manifest and result display | v1.8.2 | P1 | Add plan fingerprint/backup status in UI |
| File Associations | Scan/search/change/rollback | Existing core feature | File Associations | `scan_file_associations`, `search_file_association_app`, `apply_file_association_plan` | Partial | Quick per-row change flow and system settings explanation need polish | v1.8.2 | P1 | Add row-level create-plan affordance and better candidate state |
| Profiles | Save/list/delete/apply | Existing core feature | Profiles | `list_config_profiles`, `save_config_profile`, `delete_config_profile`, `execute_profile_apply_plan` | Partial | Rename/copy/history restore missing; import requires manual path | v1.8.2 | P1 | Add file picker for import and rename/copy flow |
| Reports | Doctor/environment/Python/file association/cleanup/port/project | Existing core feature | Reports | report export commands | Partial | Report persistence and detail density incomplete | v1.8.2 | P0 | Persist last outputs, add open report directory, show evidence summary |
| Settings | Root/update/theme/language/safety/debug | Existing core feature | Settings | `load_config`, `check_for_updates`, debug local storage | Partial | Debug is local and useful; update source details need clearer state | v1.8.2 | P1 | Keep debug filters; add update manifest evidence |
| Learning Center | Read-only command sandbox | Existing / documented capability | No main route | `run_learning_check`, `inspect_command_safety` | Missing | No current Workbench entry despite backend command | v1.8.2 | P1 | Add Toolchains or Settings section, or explicit route if IA permits |
| Command Palette | Safe shortcuts | Existing core feature | Palette | `app/commandPalette.ts` | Partial | Commands depend on visible page actions; action contract now needs automated check | v1.8.2 | P0 | Add static check for visible actions and palette targets |
| Cross-page | Button feedback | Required by #131 | All pages | `bindAction`, progress/toast/debug | Partial | No standalone action-contract check before this audit | v1.8.2 | P0 | Add `check_frontend_action_contracts.py` |
| Cross-page | i18n and raw internal labels | Required by #131 | All pages | locales + render files | Partial | Runtime/Projects still had English labels in primary UI | v1.8.2 | P0 | Localize primary labels and add mixed-language checks later |
| Cross-page | Long tasks and Risk UX | Required by #126/#128/#129 | Risk UX | `core/risk.ts`, `ui/components/riskUx.ts` | Partial | Heartbeat exists; per-command progress depends on backend support | v1.8.2 | P0 | Keep improving per-command result detail and mismatch diagnostics |

## P0 Repair Queue

1. Complete: Add a static action-contract check so rendered buttons cannot silently lack `bindAction` handlers.
2. Complete: Localize shared pagination and generic completion messages.
3. Complete: Remove English hardcoded Runtime switch/uninstall Risk text and Runtime details labels.
4. Complete: Remove English hardcoded Projects result headings and add visible apply result output.
5. Complete: Keep v1.8.1 frozen; all new feature recovery goes to v1.8.2 unless it affects update/startup/safety.
6. Complete in #132: Environment Java stabilize plan supports manual JDK directory selection and shows JAVA_HOME/PATH consistency evidence.
7. Complete in #132: Reports persists last Doctor/export state, opens the latest export location, and exposes Doctor repair plan/result.
8. Complete in #132: Cleanup has real candidate selection, move source/target/mode input, large-file open/copy, and visible cleanup/expansion results.
9. Complete in #132: Ports renders execution verification results including PID exit, port release, and remaining owners.
10. Complete in #132: Command palette/action contract checks are wired into repository hygiene.

## User Tauri Smoke Blocker Fixes

- Complete in #132: Cleanup Risk UX no longer renders structured backend results as `[object Object]`; cleanup execution result now shows success, cleaned bytes/items, skipped/failed counts, failure reasons, and report summary.
- Complete in #132: Cleanup selection and estimates count only cleanable candidates. System folders, drive roots, managed runtimes, and scan-only items are shown as skipped/not allowed and are excluded before plan creation.
- Complete in #132: Cleanup selection changes invalidate stale cleanup plans and previous execution results.
- Complete in #132: Cleanup Risk copy is cleanup-specific and explains exclusions, confirmation, and recovery expectations.
- Complete in #132: Ports now uses an explicit select -> detail -> plan -> execute flow instead of silently planning the first row.
- Complete in #132: Ports explains PID 4/System/protected owners in user-facing language and blocks normal resolution-plan actions for non-treatable owners.
- Complete in #132: Ports plan and execution Risk copy is localized and describes owner re-check and release verification.

## P1 / P2 Backlog

- P1 complete in #132: Reports persistence, latest export location, Doctor repair plan preview and execution result.
- P1 complete in #132: Environment manual JDK picker, PATH warning grouping, JAVA_HOME/PATH mismatch explanation.
- P1 complete in #132: Cleanup candidate selection, C drive rescue overview, large-file open/copy, and move plan source/target/mode input.
- P1 complete in #132: Profiles import picker, import preview, import execution result, rename, and copy.
- P1 complete in #132: Learning Center entry backed by the existing read-only command sandbox.
- P1 complete in #132: File Associations candidate list now uses current DTO fields, supports selecting a candidate, and renders apply result.
- P1 complete in #132: Toolchains surfaces update evidence, MySQL plan fingerprint/admin/backup requirements, MySQL execution result, and Learning Center output.
- P1 remaining: Profile history restore requires a durable profile history model that does not exist yet.
- P1 remaining: Cleanup duplicate scan and full multi-drive large-file workflow require backend scan commands that are not present in this branch.
- P1 remaining: Runtime final grouping, multi-version Maven/Gradle selection, and unified verification belong to v1.9.0 #130.
- P2: Docker/WSL/service UX polish.
- P2: Runtime final grouping and multi-version verification belongs to v1.9.0 #130.
