# DevEnv Manager v1.8.2 Full Feature Smoke Result

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: audit-only smoke and evidence collection. No business code was changed.

## Environment

| Item | Value |
| --- | --- |
| OS shell | Windows PowerShell |
| Repo | `G:\DevEnv-Manager` |
| PR | #132, draft |
| Branch | `codex/v1.8.2-function-audit` |
| Current HEAD | `b5d06e4` |

## Commands Run

| Check | Result |
| --- | --- |
| `git status --short --branch` | Clean worktree before audit docs. |
| `gh pr view 132 --json url,isDraft,state,headRefName,title` | PR #132 is open and draft. |
| Static frontend action/API scan with `rg` | Found entries for Dashboard, Runtime, Environment, Projects, Ports, File Associations, Cleanup, Profiles, Reports, Settings. |
| Backend cleanup command scan with `rg` | Found backend-only cleanup commands not referenced by frontend. |
| Windows listening port scan | Found 62 listening endpoints on this machine. |
| Disposable port proof | Started temporary `python` listener on `127.0.0.1:18765`; OS detected it; process was stopped and temp script deleted. |

## Automated Checks

| Check | Result |
| --- | --- |
| `python scripts/check_frontend_data_contracts.py` | Passed |
| `python scripts/check_frontend_action_contracts.py` | Passed |
| `python scripts/check_frontend_quality_regressions.py` | Passed |
| `python scripts/check_tauri_command_contract.py` | Passed: 97 frontend invokes, 168 registered commands |
| `python scripts/check_repo_hygiene.py` | Passed, including release consistency, architecture, data/action contracts, quality, command contract |
| `python scripts/check_safety_wording.py` | Passed |
| `cargo test` in `tauri/src-tauri` | Passed: 123 tests |
| `npm run build` in `tauri` | Passed |
| `npm test -- --runInBand` at repo root | Not run: repo root has no `package.json`; frontend package is under `tauri/`. |
| `python -m pytest` | Not run: current Python environment has no `pytest` module installed. |

## Real Tauri Status

| Smoke area | Result | Notes |
| --- | --- | --- |
| Browser preview at `http://127.0.0.1:1420/` | Not valid for backend checks | Direct browser preview cannot call Tauri commands and will show backend unavailable for commands such as `load_config`. |
| Tauri WebView launch | Not repeated in this audit-only pass | Previous development pass launched the Tauri app; this pass focused on inventory and evidence docs only. |
| Full click-through smoke | Not completed | Requires manual Tauri WebView interaction or browser automation against the Tauri window. |
| Screenshots | Not captured in this pass | User-provided screenshots already show HC/D readability problems; new screenshots should be captured after UI changes. |

## Smoke Matrix

| Page | Static entry | Backend/API | Real click smoke | Result |
| --- | --- | --- | --- | --- |
| Dashboard | Present | Present | Not run | Partial |
| Runtime | Present | Present | Not run | Partial |
| Environment | Present | Present | Not run | Partial |
| Projects | Present | Present | Not run | Partial |
| Ports | Present | Present | Disposable OS evidence only | Partial |
| File Associations | Present | Present | Not run | Partial |
| Cleanup | Present | Partial | Not run | Partial |
| Toolchains | Present | Present | Not run | Partial |
| Profiles | Present | Present | Not run | Partial |
| Reports | Present | Present | Not run | Partial |
| Settings | Present | Present | Not run | Partial |

## Important Smoke Findings

| Finding | Evidence | Impact |
| --- | --- | --- |
| Direct browser preview is misleading for backend availability. | User saw `Tauri backend is not available`; this is expected outside Tauri. | Testing must use `npm run tauri:dev` or packaged app. |
| Ports data exists in the real OS. | 62 listening endpoints found by `Get-NetTCPConnection`. | If UI says no useful ports, classification or UX needs review. |
| A disposable close candidate can exist. | Temporary `python` process on `127.0.0.1:18765` was detected. | Ports page should make such rows eligible for plan creation. |
| Cleanup has backend-only features. | `inspect_disk_overview`, `scan_duplicate_large_files`, archive plan commands registered but not invoked by frontend. | Users perceive missing old features. |

## Required Manual Tauri Paths

Run these from the real Tauri app, not the browser preview.

| Path | Steps | Expected evidence |
| --- | --- | --- |
| Safety | Launch app, accept safety disclaimer. | Disclaimer loads and accept persists without backend unavailable error. |
| Dashboard | Open `D`. | Cards show data or isolated partial failures, not global unavailable. |
| Ports disposable process | Start `python -m http.server 18765 --bind 127.0.0.1`, open Ports, scan, select `18765`, create plan, execute. | Plan/result area visible; process terminates or clear error explains why not. |
| Ports service process | Select service-owned row such as `svchost`/Tomcat service. | UI explains service-owned state and does not offer unsafe direct process kill. |
| Cleanup scan | Open Cleanup, scan targets, create cleanup plan, execute with a safe small target. | Candidate list, plan, receipt and verification render visibly. |
| Cleanup C rescue | Open C rescue/maintenance section, run desktop/downloads/large file checks. | Analysis results render, not toast-only. |
| Reports | Export environment, Python, file association, cleanup, port, project reports. | Export locations render and files exist. |
| Projects | Scan project, run IDEA inspect and Java consumer verify. | Results render in page sections. |
| Settings themes | Toggle Dark and High Contrast. | Feature guide/help cards remain readable. |

## Not Claimed As Passed

This audit does not claim the following are fixed or pass:

- All old cleanup functions have UI parity.
- Ports close plan works from the Tauri UI on the user's machine.
- HC/D readability has been visually fixed.
- Every button has a durable result area.
- v1.8.2 is ready for review or release.
