# DevEnv Manager v1.9.4 Stable Release Review

Status: **Release candidate verified; publication pending**

The v1.9.4 product source and final installers are based on frozen product commit `9e1391b8d60afdf508931d7f02e92e02ea37360d`. This record covers the first-run guide, Cleanup and Ports workflow simplification, automated feature-completeness gates, exact asset identities, and validation boundaries.

## Scope Delivered

- A four-step bilingual getting-started guide appears after the safety notice when onboarding has not been completed.
- Completing, skipping, or dismissing the first-run guide persists `onboardingCompleted=true` in the existing local `settings.json`.
- Legacy settings without the new field deserialize safely with onboarding incomplete; existing root, update, safety, Profile, and Runtime data are not reset.
- Settings includes a permanent entry for reopening the guide without changing the saved first-run state.
- Cleanup is divided into Quick cleanup, space recovery, and advanced tools. Primary scan, cleanup, cache, archive, Recycle Bin, and result controls are grouped by task.
- Eligible user/developer listeners expose a one-flow safe release action. The UI no longer asks the user to manually manage a plan ID or token, while the backend still creates a bound plan, consumes a single-use confirmation token, re-checks ownership, rejects protected processes, and verifies release by rescanning.
- Feature acceptance now records 47 functions and explicitly checks the onboarding backend command, frontend entry, stable selectors, persistence contract, bilingual content, and visual behavior.

## Source Freeze Gates

- Product source commit: `9e1391b8d60afdf508931d7f02e92e02ea37360d`.
- Rust tests: 231 passed, 0 failed.
- Rust formatting and Clippy with warnings denied: passed.
- Frontend production build: 114 modules passed.
- Frontend acceptance: 293 stable selectors; onboarding, Cleanup, Ports, Runtime, service, toolchain, and Debug-storage suites passed.
- Edge visual acceptance: 34 passed, 0 failed, release blocking false.
- Visual onboarding coverage: Light English, Dark Chinese, and compact High Contrast Chinese, including next/back navigation and keyboard focus.
- Feature manifest: 47 features; P0=22, P1=24, P2=1.
- Combined feature acceptance: 303 cases; 256 passed, 0 failed, 41 safely skipped, and 6 manual/policy cases.
- Backend-only, UI-only, missing, partial, deferred, toast-only, P0 failures, and P1 failures: 0.
- Backend/UI drift, Tauri command, frontend data/action/quality/localization, safety wording, repository hygiene, migration completeness, and release-disposition checks passed.

Safe acceptance deliberately skips commands that require a running Tauri backend or real destructive/privileged state. Existing manual policy records cover arbitrary process termination, Windows feature mutation, service mutation, database repair, and advanced-mode visual policy; none represents missing v1.9.4 product code.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.9.4_x64-setup.exe` | 2,962,510 bytes | `ad0b569ace83dc7b224fe841b97baa3fd6e15215c384e92a1d98f33493f644c1` | NotSigned |
| MSI | `DevEnv.Manager_1.9.4_x64_en-US.msi` | 4,952,064 bytes | `ec492b921a004324c5958d01231b177dba82ecf73e418df43e02a7a53ab40f62` | NotSigned |

Both installers came from one `tauri build`. The release executable is 7,020,032 bytes, has SHA256 `c0fadea4c4b64819c4de5eea0c8df2ec18dbb989cb02f6b113a99a9ab1bf6d44`, and reports file/product version 1.9.4. MSI metadata reports product name `DevEnv Manager`, product version 1.9.4, x64 template `x64;0`, and ProductCode `{906BF2E7-AC98-46A9-A1A0-4496A1742BDA}`.

Only the two installer files in this table are publication assets.

## Validation Boundary

The release build completed successfully and exact EXE/MSI/NSIS metadata was checked directly. An attempted isolated release-EXE launch was redirected by the Windows application identity to the already installed app, so it is not counted as a release-binary first-run smoke. The first-run behavior is instead covered by:

- a Rust legacy-settings migration test;
- a frontend persistence and command-registration acceptance test;
- browser DOM interaction that advances to step 2 and returns to step 1;
- three real Edge screenshot, contrast, overflow, keyboard-focus, and localization cases.

No installer, UAC, environment mutation, port termination, cleanup deletion, service mutation, database repair, disk operation, or user configuration replacement was performed during this release review. Previously retained installation and protected-operation evidence remains applicable because installer paths and high-risk backend execution contracts were not changed.

## Non-Blocking Disclosures

- Assets are not Authenticode-signed; Windows may display its normal trust warning.
- The minified frontend bundle is approximately 538 kB and triggers Vite's advisory chunk-size warning. It does not fail build or acceptance and remains a performance follow-up.
- Issue #130 remains open for broader Runtime provider lifecycle and ecosystem work.
- Issue #133 remains open for the application-internal Acceptance Center.
- Tracking issues with remaining scope are not closed by this release.

## Publication Verification

- Release PR, CI, merge commit, tag, GitHub Release, Gitee Release, online asset hashes, and stable update-channel smoke will be recorded after publication.

## Release Decision

The reviewed source and exact assets are ready to enter the PR, target-main CI, tag, dual-platform publication, online hash verification, and update-channel smoke sequence.
