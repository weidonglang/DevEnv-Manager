# DevEnv Manager v1.8.2 Cleanup Feature Gap

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: Cleanup feature inventory and old-function parity audit. This is audit-only.

## Summary

Cleanup is not at old-feature parity. The current frontend exposes common cleanup scan/plan/execute, generic move, rollback, C-drive rescue, large-file scan, cache clean, and expansion flows. However, several backend commands are registered and implemented but have no frontend entry, including disk overview, duplicate large-file scan, and dedicated desktop/downloads archive plans.

## Current Cleanup UI Coverage

| Feature | Frontend entry | Backend command/API | Status |
| --- | --- | --- | --- |
| Maintenance overview | Present | `inspect_maintenance_overview` | Wired |
| Scan cleanup targets | Present | `scan_cleanup_targets` | Wired |
| Create cleanup plan | Present | `create_cleanup_plan` | Wired |
| Execute cleanup plan | Present | `clean_selected_targets` | Wired |
| Clear download cache | Present | `clear_download_cache` | Wired |
| Clean dev cache | Present | `clean_dev_cache` | Wired |
| Generic move plan | Present | `create_move_plan` | Wired |
| Execute generic move | Present | `execute_move_plan` | Wired |
| Rollback move | Present | `rollback_move`, `list_rollback_records` | Wired |
| Inspect C-drive rescue | Present | `inspect_partition_layout`, folder analysis APIs | Partial |
| Scan large files | Present | `scan_large_files` | Partial; UI appears C-drive oriented |
| Create C expansion plan | Present | `create_c_drive_expansion_plan` | Wired |
| Execute C expansion plan | Present | `execute_c_drive_expansion` | Wired |
| Open analysis path | Present | `open_analysis_path` | Wired |

## Backend-Only Cleanup Commands

| Backend command | Found in backend | Frontend invoke found | Status |
| --- | --- | --- | --- |
| `inspect_disk_overview` | Yes | No | Gap |
| `scan_duplicate_large_files` | Yes | No | Gap |
| `create_desktop_archive_plan` | Yes | No | Gap |
| `execute_desktop_archive_plan` | Yes | No | Gap |
| `create_downloads_archive_plan` | Yes | No | Gap |
| `execute_downloads_archive_plan` | Yes | No | Gap |

## Old Feature Questions

| Question | Audit answer |
| --- | --- |
| Desktop rescue is fully back? | No. `inspect_desktop` exists, but dedicated desktop archive plan/execute is not wired. |
| Downloads rescue is fully back? | No. `inspect_downloads` exists, but dedicated downloads archive plan/execute is not wired. |
| Duplicate files can be scanned from UI? | No frontend invoke found for `scan_duplicate_large_files`. |
| Multi-disk overview is visible? | No direct frontend invoke found for `inspect_disk_overview`. |
| Large-file scan supports non-C drive? | Backend accepts root; current UI appears focused on C rescue. Needs UI proof or enhancement. |
| Cleanup report covers all old features? | Export exists, but missing UI features mean report parity is incomplete. |

## Result/Feedback Risks

| Action | Risk |
| --- | --- |
| Quick cleanup actions | Need durable result panel, not only toast. |
| Open analysis path | Toast is acceptable only if paired with current selection/context. |
| Move/rollback | Must render plan, receipt, backup/rollback id and verification. |
| Expansion | Must render disk/partition plan and explicit refusal reasons. |
| Backend-only commands | Users cannot discover or run them, causing "function missing" reports. |

## P0 Recovery List

| Work | Acceptance criteria |
| --- | --- |
| Add disk overview section | Calls `inspect_disk_overview`, renders all volumes and free/used status. |
| Add duplicate large-file scan | Calls `scan_duplicate_large_files`, renders duplicate groups, sizes, paths, safe actions or read-only note. |
| Add desktop archive flow | Calls `create_desktop_archive_plan`, renders plan, executes via token, renders receipt/rollback. |
| Add downloads archive flow | Calls `create_downloads_archive_plan`, renders plan, executes via token, renders receipt/rollback. |
| Add old-feature smoke | Manual Tauri path for every cleanup action with pass/fail evidence. |

## P1 Recovery List

| Work | Acceptance criteria |
| --- | --- |
| Multi-root large-file scan | User can choose root/drive and scan results are labeled by root. |
| Report parity | Cleanup report includes disk overview, desktop/downloads analysis, duplicate scan summary, plan receipts. |
| Durable results | Every cleanup action writes an in-page result area and debug event. |
| Empty/error states | No silent disabled buttons; every unavailable action has reason text. |
