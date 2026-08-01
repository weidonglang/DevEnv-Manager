# DevEnv Manager v1.9.2 Stable Release Review

Status: **Published and verified on GitHub and Gitee**

The v1.9.2 product source and reviewed assets are pinned to source commit `bfa7b3c`. This document records the Debug storage hotfix, exact assets, automated gates, isolated real-Tauri evidence, publication boundaries, and remaining follow-up work.

## User Notice

We apologize to users who experienced a pause when first opening Runtime or another data-heavy page, saw "Unable to load Runtime", or received `Setting the value of 'devenv.debug.entries' exceeded the quota`. Diagnostic history must never turn a successful backend operation into a failed page load. v1.9.2 gives Debug persistence a strict capacity boundary and isolates every storage failure from product behavior.

## Scope Delivered

- Persisted Debug history is limited to 200 entries and 256 KiB.
- Strings, arrays, object keys, and object depth are compacted before persistence.
- Oversized history left by an older version is compacted on first use.
- If replacing a quota-sized value fails, the stale Debug key is removed and progressively smaller batches are attempted.
- If browser storage is unavailable, the current session continues with an in-memory Debug history.
- Debug reads, writes, removal, and change notifications are best effort and cannot reject a successful Tauri invoke.
- Secret redaction, user-home redaction, circular-value handling, Markdown export, and JSON export remain available.
- Duplicate full parameter and result copies are no longer retained.
- A dedicated acceptance harness covers legacy oversized history, forced `QuotaExceededError`, large and circular values, secret redaction, unavailable storage, and latest lifecycle retention.

## Source Freeze Gates

- Exact product source: `bfa7b3c`.
- Rust tests: 230 passed, 0 failed.
- Clippy: `cargo clippy --all-targets -- -D warnings` passed.
- Frontend production build: 113 modules passed.
- Frontend acceptance selectors: 268 passed.
- Debug storage acceptance: passed.
- Feature acceptance: 300 total; 254 passed, 0 failed, 40 policy skips, and 6 manual/policy records.
- P0 and P1 failures: 0.
- Backend-only, UI-only, missing, partial, deferred, and toast-only release features: 0.
- Backend/UI drift: 191 registered commands, 158 frontend invokes, and 152 manifest commands.
- Tauri command, frontend data/action/quality/localization, safety wording, repository hygiene, architecture, and release contract gates passed.

The 40 safe skips are destructive, privileged, or installed-application actions that safe mode deliberately does not repeat. The six manual/policy records remain documented policy boundaries and do not represent failed or missing P0/P1 functionality.

## Real Tauri Quota Regression

The final release executable was launched with isolated `APPDATA`, `LOCALAPPDATA`, and temporary directories. The smoke test:

1. waited for initial read-only startup commands to settle;
2. wrote 80 legacy Debug entries totaling 2,446,461 characters;
3. reloaded the application;
4. opened Runtime, opened Environment, and returned to Runtime;
5. inspected the page state and persisted Debug storage.

Result:

- Runtime rendered successfully.
- No global or Runtime error panel was present.
- No visible quota error or failed Debug operation was recorded.
- Persisted Debug history compacted below the 262,144-character limit.
- No UAC prompt or system mutation was used.

Raw evidence is retained in the Git-ignored `artifacts/release-lab/v1.9.2/bfa7b3c/` directory.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.9.2_x64-setup.exe` | 2,954,232 bytes | `b3a6101e0ff17c03e9d1b1e8a72fdcabc419a516bbee53113d65a5218c242602` | NotSigned |
| MSI | `DevEnv.Manager_1.9.2_x64_en-US.msi` | 4,943,872 bytes | `414995f8bdad47bd4634e79f018dcb3827d03c98f97b2ef98d6081573b7e5a2c` | NotSigned |

Both assets were produced by one `tauri build` from exact source commit `bfa7b3c`. The release executable is 7,010,816 bytes and reports file and product version 1.9.2. MSI metadata reports product name `DevEnv Manager`, product version 1.9.2, x64 architecture, and ProductCode `{E3A1FB36-E395-4909-A739-9F1729DA5D6B}`.

Only the two files in this table are publication assets.

## Risk-Driven Validation Boundary

This hotfix changes frontend Debug persistence and version metadata. It does not change installer behavior, startup configuration paths, configuration migration, Runtime mutation contracts, environment writes, services, ports, cleanup, file associations, profiles, or other privileged operations.

Accordingly, the unrelated UAC and full installer lifecycle matrix was not repeated. The previously published v1.9.1 install, upgrade, uninstall, settings preservation, Profile preservation, and Runtime switch evidence remains applicable. The final v1.9.2 asset metadata and real release executable were checked directly, and the affected oversized-storage startup path was exercised in a real Tauri WebView.

## Non-Blocking Disclosures

- The bundles are not Authenticode-signed. Windows may show its normal trust warning.
- Safe acceptance does not terminate arbitrary user processes or repeat destructive, privileged, service, database, or disk operations.
- Issue #130 remains open for broader Runtime lifecycle work.
- Issue #133 remains open for the application-internal Acceptance Center.
- Tracking issues with remaining content are not closed by this release.

## Publication Verification

- PR #144 CI run `30601488888` passed before merge.
- Target `main` CI run `30601878350` passed after merge, including Rust tests, formatting, Clippy, frontend build, static/safe/frontend acceptance, Edge visual acceptance, report generation, and repository hygiene.
- Annotated tag `v1.9.2` points to merge commit `199c95c14de4f5d551350cd3e93139f7b51fdfe9` and was pushed to GitHub and Gitee.
- [GitHub Release](https://github.com/weidonglang/DevEnv-Manager/releases/tag/v1.9.2) and [Gitee Release](https://gitee.com/weidonglang/DevEnv-Manager/releases/tag/v1.9.2) are public and contain the reviewed NSIS and MSI assets.
- Both binaries were independently downloaded from both platforms. All four online files matched the exact sizes and SHA256 values in this document.
- GitHub and Gitee `main` manifests independently returned version 1.9.2, channel `stable`, platform `windows-x64`, the reviewed NSIS identity, and two mirrors.
- The long-lived `update` Release contains exactly one English and one Chinese manifest on each platform. All four returned the same v1.9.2 identity.
- A real installed v1.9.1 executable ran the application-owned `check_for_updates` command with isolated app data. It returned `latestVersion=1.9.2`, `updateAvailable=true`, no failed sources, the reviewed file name, size and SHA256, and both Gitee and GitHub mirrors.
- The online smoke was read-only. It did not install, execute a downloaded update, request UAC, or modify the user's real application settings.
- This publication proof is documentation-only. It does not alter the tagged source or reviewed binaries and does not require another build or ReleaseLab cycle.

## Release Decision

v1.9.2 is released. No source, automated-test, CI, asset, publication, or update-channel blocker remains. Broader Runtime lifecycle work and the application-internal Acceptance Center remain explicitly tracked in issues #130 and #133.
