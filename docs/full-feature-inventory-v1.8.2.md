# DevEnv Manager v1.8.2 Full Feature Inventory

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: full entry inventory, static wiring audit, limited real Windows evidence. This is an audit-only record; no business code was changed in this round.

## Result Legend

| Status | Meaning |
| --- | --- |
| OK | Entry, backend command, visible result, and risk flow are present by static audit. |
| Partial | Feature exists but is incomplete, has missing result rendering, or needs manual Tauri proof. |
| Gap | Old or backend feature exists but no complete UI entry is wired. |
| Blocked | Cannot be confirmed without real Tauri clicking or external environment. |

## Inventory Matrix

| Area | Feature | Entry | Backend command/API | Result rendering | Risk/token flow | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Snapshot summary | Sidebar `D` / dashboard route | `load_dashboard_snapshot`, child APIs | Cards render partial failures independently | Read-only | Partial | Static entry/API present; real click not repeated in this audit round. |
| Dashboard | Port summary | Dashboard card | `scan_ports` / snapshot port data | Shows "not scanned" / partial state | Read-only | Partial | Must avoid treating unscanned ports as error. |
| Runtime | Runtime list | Sidebar `R` | runtime APIs | Runtime cards/table | Token for managed switch/uninstall | Partial | v1.8.1 fixed field mapping; v1.9.0 #130 remains main runtime redesign. |
| Runtime | External runtime open/copy | Runtime cards | open/copy APIs | Toast plus visible cards | No destructive action | OK | External runtime should not show switch/uninstall. |
| Runtime | Managed switch/uninstall | Runtime cards | tokenized runtime actions | Plan/result areas | Required | Partial | Needs manual Tauri proof for every managed runtime kind. |
| Environment | Doctor | Sidebar `E` | environment doctor APIs | Report cards and warnings | Read-only / token for repair | Partial | Field contract was fixed earlier; smoke not repeated here. |
| Environment | JAVA_HOME and PATH display | Environment page | env reliability snapshot | JAVA_HOME raw/expanded, process env, effective tools | Read-only | Partial | Must continue checking against `types.ts`; no new violation found in this audit. |
| Environment | Repair plan/execute | Environment page | repair plan + execute | Plan and receipt areas | Required | Partial | Static plan/execute flow exists; real execution not performed. |
| Projects | Project scan | Sidebar `P` | project analysis APIs | root, projectTypes, detectedFiles, package manager | Read-only | Partial | Must keep result areas for inspect/verify, not toast-only. |
| Projects | IDEA inspect | Projects page | IDEA inspect API | Rendered result expected | Read-only | Partial | Static handlers exist; manual Tauri proof still required. |
| Projects | Java consumer verify | Projects page | Java consumer verify API | Rendered result expected | Read-only | Partial | Static handlers exist; manual Tauri proof still required. |
| Ports | Port scan | Sidebar `PS` | `scan_ports`, `port_history` | Table, selection, detail | Read-only | Partial | Real OS sample found 62 listening endpoints on this machine. |
| Ports | Create close plan | Ports page | `create_port_resolution_plan` | Plan/result area | Required for destructive action | Partial | Static entry exists; closability matrix still shows UX uncertainty for user machines with many service ports. |
| Ports | Execute close plan | Ports page | `execute_port_resolution_plan` | Receipt/result area | Required | Partial | Needs manual proof with disposable process in Tauri UI. |
| Ports | Inspect local services | Ports page | `inspect_local_services` | Service result area | Read-only | OK | Static entry exists. |
| Ports | Stop local service | Ports page | `stop_local_service` | Result/toast | High-risk | Partial | Should remain service-specific and protected by confirmation. |
| Ports | Open process location | Ports page | `open_process_location` | Toast/result | Low-risk | Partial | Static entry exists; no real click evidence in this audit. |
| File associations | Scan associations | Sidebar `FA` | file association report APIs | Table and metrics | Read-only | OK | Static entry/API present. |
| File associations | Change open-with | File association rows | plan + execute | Plan/receipt | Required | Partial | Static flow exists; real execution not performed. |
| File associations | Restore backup | File association page | restore API | Receipt/toast | Required | Partial | Static flow exists; real execution not performed. |
| Cleanup | Scan cleanup targets | Sidebar `C` | `scan_cleanup_targets` | Candidates and metrics | Read-only | OK | Static entry/API present. |
| Cleanup | Create/execute cleanup plan | Cleanup page | `create_cleanup_plan`, `clean_selected_targets` | Plan/receipt | Required | Partial | Static flow exists; manual Tauri proof still required. |
| Cleanup | Downloads/dev cache quick clean | Cleanup page | `clear_download_cache`, `clean_dev_cache` | Result/toast | Risk flow expected | Partial | Static entry exists; needs visible result check. |
| Cleanup | Move folder | Cleanup page | `create_move_plan`, `execute_move_plan`, `rollback_move` | Plan/receipt/rollback list | Required | Partial | Generic move wired; desktop/downloads archive-specific old flows are not wired. |
| Cleanup | Desktop analysis | Cleanup C rescue panel | `inspect_desktop` | Folder overview | Read-only | Partial | Analysis exists, dedicated archive action missing. |
| Cleanup | Downloads analysis | Cleanup C rescue panel | `inspect_downloads` | Folder overview | Read-only | Partial | Analysis exists, dedicated archive action missing. |
| Cleanup | Disk overview | Backend-only | `inspect_disk_overview` | Not dedicated in UI | Read-only | Gap | Command registered but no direct frontend invoke found. |
| Cleanup | Duplicate large files | Backend-only | `scan_duplicate_large_files` | Not in UI | Read-only | Gap | Command registered but no frontend invoke found. |
| Cleanup | Desktop archive plan | Backend-only | `create_desktop_archive_plan`, `execute_desktop_archive_plan` | Not in UI | Required | Gap | Commands registered but no frontend invoke found. |
| Cleanup | Downloads archive plan | Backend-only | `create_downloads_archive_plan`, `execute_downloads_archive_plan` | Not in UI | Required | Gap | Commands registered but no frontend invoke found. |
| Cleanup | Large files scan | Cleanup C rescue panel | `scan_large_files` | List/table | Read-only | Partial | UI appears C-drive oriented; backend accepts root parameter. |
| Cleanup | C drive expansion | Cleanup page | `create_c_drive_expansion_plan`, `execute_c_drive_expansion` | Plan/result | Required | Partial | Static entry exists; real execution not performed. |
| Toolchains | JDK helper | Sidebar/toolchains | toolchain APIs | Cards/result areas | Mixed | Partial | Static entry present; older JDK-specific expectations should be compared in #125. |
| Toolchains | MySQL diagnosis/repair | Toolchains page | MySQL diagnose/plan/execute APIs | Diagnosis/plan/result | Required for repair | Partial | Static handlers exist; real MySQL environment not audited. |
| Profiles | List/save/apply/import/export | Sidebar `PR` | profile APIs | Lists, preview, plan/result | Required for apply/import | OK | Static entry/API present. |
| Reports | Doctor report | Sidebar `RP` | doctor plan/run/export APIs | Summary/export cards | Read-only/plan for doctor action | Partial | Static entry present; real export path not exercised in this audit. |
| Reports | Environment/Python/File association/Cleanup/Port/Project exports | Reports page | `export_*_report` APIs | Export location/toast | Read-only write file | Partial | Static entries exist; manual export proof still required. |
| Settings | Theme/language/root/update/debug | Sidebar `S` | settings APIs | Settings panels/debug table | Low-risk | Partial | HC/D visual issue previously observed by user; needs screenshot QA after fixes. |
| Safety | Safety disclaimer | Startup panel | `load_config`, `accept_safety_disclaimer` | Blocking panel in preview without Tauri | N/A | Partial | Browser preview correctly cannot call backend; real Tauri required. |

## Cross-Cutting Findings

| Finding | Impact | Status |
| --- | --- | --- |
| Some backend commands are registered but have no visible frontend entry. | Users see fewer functions than old versions even though backend work exists. | Gap |
| Several action handlers still complete through toast/progress messages. | User cannot review durable results after clicking. | Partial |
| Real browser preview at `http://127.0.0.1:1420/` is not a valid backend test. | It shows "Tauri backend is not available" by design when opened outside Tauri WebView. | Known |
| Ports page can appear broken when the machine has mostly system/service-owned endpoints. | User may see many ports but no safe close action. | Needs UX clarification and manual proof |
| Cleanup old-feature parity is incomplete. | Desktop/downloads archive and duplicate scan are backend-only. | Gap |

## Suggested Next Implementation Batch

| Priority | Work |
| --- | --- |
| P0 | Add UI entries/result panels for backend-only cleanup features: disk overview, duplicate large files, desktop archive, downloads archive. |
| P0 | Run real Tauri click-smoke for Ports with a disposable process and record screenshot/log evidence. |
| P0 | Make Ports closability state explicit per row: protected, service-owned, user process, disposable candidate, requires service flow. |
| P1 | Convert toast-only outcomes into durable result panels for quick cleanup, open path, export, and project inspections. |
| P1 | Add frontend contract checks for backend-only command drift and action-without-result regressions. |
| P2 | Recompare old v1.5-v1.7 cleanup/JDK/project helper flows against current sidebar and command palette. |
