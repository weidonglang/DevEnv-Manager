# DevEnv Manager v1.8.2 Old Feature Recovery Gap

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: compare current visible workbench with known old-feature expectations from #125 and #131. This is audit-only.

## Backend-Only Features

These commands exist in the Tauri backend registration or Rust modules but no frontend invocation was found in `tauri/src/features`, `tauri/src/app`, `tauri/src/components`, or `tauri/src/core`.

| Feature | Backend command | Frontend status | Impact |
| --- | --- | --- | --- |
| Disk overview | `inspect_disk_overview` | No direct frontend invoke found | Cleanup lacks a clear multi-disk overview entry. |
| Duplicate large file scan | `scan_duplicate_large_files` | No frontend invoke found | Old duplicate/large-file cleanup workflow is missing from UI. |
| Desktop archive plan | `create_desktop_archive_plan` | No frontend invoke found | Desktop rescue is analysis-only or generic move, not old dedicated archive flow. |
| Desktop archive execute | `execute_desktop_archive_plan` | No frontend invoke found | Dedicated desktop archive cannot be completed from UI. |
| Downloads archive plan | `create_downloads_archive_plan` | No frontend invoke found | Downloads rescue is analysis-only or generic move, not old dedicated archive flow. |
| Downloads archive execute | `execute_downloads_archive_plan` | No frontend invoke found | Dedicated downloads archive cannot be completed from UI. |

## UI-Only Or Partial Features

| Feature | Current UI | Gap |
| --- | --- | --- |
| Cleanup C rescue | Has inspection and large-file oriented controls | Does not expose all backend rescue/archive functions. |
| Quick cleanup buttons | Visible actions for download/dev cache cleanup | Must confirm durable result area; toast-only feedback is not enough. |
| Ports close action | Visible plan/execute flow | Must prove disposable process can be closed from real Tauri UI. |
| Reports export buttons | Visible export actions | Must prove every export renders location and file exists. |
| Project inspect/verify | Visible actions | Must prove results render, not only toast. |

## Missing Old Features

| Old expectation | Current status | Suggested owner |
| --- | --- | --- |
| Dedicated Desktop rescue/archive flow | Missing complete UI wiring | v1.8.2 P0 |
| Dedicated Downloads rescue/archive flow | Missing complete UI wiring | v1.8.2 P0 |
| Duplicate large-file scan | Backend-only | v1.8.2 P0 |
| Multi-disk overview | Backend-only or hidden behind another panel | v1.8.2 P0 |
| Multi-disk large-file selection | UI appears C-drive focused | v1.8.2 P1 |
| Full old cleanup report parity | Export exists, but feature coverage is incomplete | v1.8.2 P1 |
| Runtime old convenience controls | Partial; v1.9.0 runtime redesign planned | v1.9.0 #130 |

## Broken Existing Features To Verify

| Feature | Risk | Evidence needed |
| --- | --- | --- |
| Ports close flow | User reports still unavailable | Real Tauri disposable port click-smoke. |
| Cleanup page | User reports still unavailable | Real Tauri scan/plan/execute smoke. |
| HC/D readability | User screenshots show unreadable panels | New screenshots after UI changes. |
| Feature guide collapse behavior | User reported Report guide stayed expanded | Manual page state check across routes. |
| Browser preview confusion | User opened `127.0.0.1:1420` directly and saw backend unavailable | Documentation/test instruction fix. |

## False Completed Items

| Item | Why it is false-complete |
| --- | --- |
| "Cleanup old features restored" | Several cleanup backend commands remain unexposed in frontend. |
| "Ports fixed" | Static flow exists, but user's real machine still reported no usable close action; disposable UI proof is missing. |
| "All buttons have feedback" | Static scan still shows several toast/progress outcomes that need durable result panels. |
| "Full smoke passed" | This round did not perform full Tauri click-through smoke. |

## Deferred With Reason

| Item | Deferred to | Reason |
| --- | --- | --- |
| Runtime architecture redesign | v1.9.0 #130 | Large data/model redesign, outside v1.8.2 P0 parity work. |
| Service stop policy expansion | v1.8.2 or later | Must remain conservative; service-owned ports should not be killed as ordinary processes. |
| Full visual redesign | v1.8.2 P1/P2 | HC/D readability is important, but old-feature recovery is currently higher risk. |

## Suggested Next Implementation Batch

| Priority | Work |
| --- | --- |
| P0 | Wire Cleanup disk overview, duplicate scan, desktop archive, downloads archive into UI with result panels. |
| P0 | Add a Ports disposable-process Tauri smoke script/manual checklist and record result. |
| P0 | Add row-level port closeability explanations and avoid silent disabled states. |
| P1 | Replace toast-only success paths with durable result sections for quick cleanup, exports, project inspections, and open-path actions. |
| P1 | Add old-feature regression check that flags registered backend commands with no frontend entry. |
| P2 | Build an old-version feature matrix from tags `v1.5.x` through `v1.8.1` and link it to #125. |
