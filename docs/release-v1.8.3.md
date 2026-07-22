# DevEnv Manager v1.8.3 Release Candidate Review

Status: **BLOCKED - do not publish**

This document records the current v1.8.3 candidate evidence without changing the public stable channel. `README.md`, `update-manifest.json`, and `update-manifest.cn.json` remain on v1.8.2 until every release gate below passes.

## Scope

v1.8.3 is a focused hotfix for duplicate visible port groups, service-host identity evidence, archive target selection, Recycle Bin preview/cleanup, Dark and High Contrast readability, and backend text localization. Runtime redesign and Profile history remain separately tracked for v1.9.0.

## Completed Code Gates

- Candidate metadata: package, Cargo, and Tauri versions are aligned at `1.8.3`.
- Public stable metadata: remains aligned at `1.8.2`.
- Rust: 202 passed, 0 failed.
- Clippy: `cargo clippy --locked --all-targets -- -D warnings` passed.
- Formatting: `cargo fmt --all -- --check` passed.
- Frontend production build: 113 modules built.
- Frontend acceptance: service selection, toolchain actions, port grouping, cleanup workflow, and 228 selectors passed.
- Static acceptance: 69 total, 66 passed, 0 failed, 2 deferred, 1 manual.
- Safe acceptance: 212 total, 167 passed, 0 failed, 38 safely skipped, 7 manual/deferred.
- Aggregate acceptance: 283 total, 235 passed, 0 failed, 40 safely skipped, 8 manual/deferred.
- Current feature inventory: 46 features; 43 implemented, 2 explicitly deferred, 1 manual-only; no `partial`, `backendOnly`, `uiOnly`, or `missing` feature.
- Backend/UI drift, frontend data/action/quality/i18n, toast-only, Tauri command, repository hygiene, safety wording, and release consistency checks passed.
- Isolated capability fixtures: 14/14 passed.
- Automated visual acceptance: 30/30 passed twice after the new baseline was generated; the matrix covers Light, Dark, System, High Contrast, English/Chinese, compact/wide layouts, and high DPI.
- Local installer build: fresh x64 MSI and NSIS bundles were generated on 2026-07-22 from the current candidate tree.

The 40 skipped cases are commands that require a running Tauri backend, app-specific token/state, or an installed Windows mutation boundary. They are not counted as passed. The eight manual/deferred records include the v1.9.0 Runtime redesign, Profile history storage, P2 advanced-mode visual policy, and destructive installed-app paths that must be covered by the release candidate gates below.

## Release Blockers

1. **Installed lifecycle evidence is pending.** Fresh NSIS and MSI install/start/uninstall, v1.8.2 to v1.8.3 upgrade, settings/Profile retention, and final clean-state checks must run against the exact final assets.
2. **ReleaseLab functional evidence is pending.** Disposable dual-stack ports, archive/rollback, and Recycle Bin plan/token/execute/rescan must run in an isolated Windows VM. No test may empty the host user's real Recycle Bin.
3. **Repository/CI/review gates are pending.** The work is not committed, pushed, or validated by latest-head GitHub CI. Independent code and release-asset review has not completed.
4. **Final asset identity is pending.** The hashes below identify the current local candidate only. Assets must be rebuilt from the reviewed commit and pass installed/online verification before publication.

## Current Local Candidate Assets

These files are eligible for the next isolated validation step but are not yet publishable final assets.

| Bundle | File | Size | SHA256 |
|---|---|---:|---|
| NSIS | `DevEnv Manager_1.8.3_x64-setup.exe` | 2,836,271 bytes | `7c8c318bb02463af19bc2d65dee4afa109e64ffdc03d4d38113ba511cb0724e4` |
| MSI | `DevEnv Manager_1.8.3_x64_en-US.msi` | 5,058,560 bytes | `23da9345c0b046ae0389b58befff41edaa3e8ffc7c58e94194ee9239b1f423ec` |

## Deferred Non-v1.8.3 Scope

- `runtime.v19.fullRedesign`: tracked by #130 for v1.9.0.
- `profiles.historyRestore`: requires Profile schema v2 and durable backend history storage for v1.9.0.
- `advanced.mode`: P2 visual/policy follow-up; it cannot replace the v1.8.3 automated visual gate.

## Required Order

1. Generate fresh v1.8.3 MSI and NSIS assets from the reviewed candidate.
2. Run automated visual acceptance and approve a new screenshot baseline.
3. Run isolated ReleaseLab port, archive/rollback, and Recycle Bin evidence.
4. Run NSIS/MSI lifecycle and v1.8.2 upgrade/retention tests using the exact assets.
5. Record final sizes and SHA256 values; verify the workspace contains no unintended files.
6. Commit and push the candidate, then require latest-head GitHub CI to pass.
7. Perform independent code, evidence, metadata, and asset review.
8. Only after a GO decision: merge, re-check target-branch CI, build/verify final assets from the merged commit, tag `v1.8.3`, publish GitHub and Gitee releases, switch stable manifests, verify online hashes, and run update-channel smoke.

Until all release blockers are cleared, v1.8.2 remains the public stable version and v1.8.3 must not be tagged or published.
