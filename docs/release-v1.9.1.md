# DevEnv Manager v1.9.1 Stable Release Review

Status: **Release candidate approved for publication**

The v1.9.1 product source and reviewed assets are pinned to source commit `4137fbe75f50b46c7f4818c9bd29e1e4b38946f3` in PR #142. This document records the Runtime switching hotfix, exact assets, automated gates, Windows ReleaseLab evidence, and publication boundaries.

## User Notice

We apologize to users who clicked "Set current" in v1.9.0 and received no durable indication that Runtime switching had started, or who had to edit environment variables manually because a verified external Runtime could not be adopted. PATH, `JAVA_HOME`, provider, and project SDK changes must never leave users guessing. v1.9.1 makes preparation, plan review, execution, verification, failure, backup, and recovery visible and testable.

## Scope Delivered

- Managed JDK, Python, Node.js, Go, Maven, and Gradle rows expose durable preparing, plan-created, executing, verifying, success, and failure states.
- The frontend submits only a stable Runtime ID and an allowlisted switch mode. The backend re-resolves trusted discovery, verification, executable, source-authority, and provider evidence.
- Strongly verified external JDK, Python, Node.js, Go, Maven, and Gradle installations can be adopted into the user environment without writing, moving, deleting, or uninstalling their directories.
- nvm, fnm, Volta, Scoop, and rustup use provider-aware adapters. Non-rustup Rust remains read-only.
- .NET SDK selection is project-scoped through `global.json`; unknown tools remain read-only.
- Exact backend-stored plans contain target identity, environment diff, source authority, backup, state and file/provider fingerprints, expiry, risk, and confirmation-token contract.
- Plans reject expired, stale, tampered, reparse-changed, provider-changed, or already-consumed state.
- Execution verifies a newly launched child command and required components. Failure records rollback and verification evidence.
- Persistent Runtime switch backups are listed after application restart. The final source fix prevents initial page loading from discarding the backup list returned by the backend.
- The public legacy direct `switch_runtime` command is removed.

## Source Freeze Gates

- Rust tests: 230 passed, 0 failed.
- Clippy: `cargo clippy --all-targets -- -D warnings` passed.
- Frontend production build: 113 modules passed.
- Frontend acceptance selectors: 268 passed.
- Visual acceptance: 30 passed, 0 failed.
- Feature acceptance: 300 total; 254 passed, 0 failed, 40 policy skips, and 6 manual/policy records.
- P0 and P1 failures: 0.
- Backend-only, UI-only, missing, partial, deferred, and toast-only release features: 0.
- Backend/UI drift: 191 registered commands, 158 frontend invokes, and 152 manifest commands.
- Tauri command, frontend data/action/quality/localization, safety wording, repository hygiene, and release consistency gates passed.
- GitHub Actions run `30529048257` for exact source commit `4137fbe` passed.

The 40 safe skips are destructive, privileged, or installed-application actions that safe mode deliberately does not repeat. The six manual/policy records cover disposable process termination, previously retained Windows feature/service/database evidence, and advanced visual policy. They do not represent failed or missing P0/P1 functionality.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.9.1_x64-setup.exe` | 2,951,926 bytes | `ce4b9020d47258dd1668f0237a0b3fd0b061ddfc20c938fed56f5ddcf5cd0352` | NotSigned |
| MSI | `DevEnv.Manager_1.9.1_x64_en-US.msi` | 4,943,872 bytes | `cf26c80e2f67eb61b3c000e8bb91dd30af96deb6131268ec8350819e85a540c3` | NotSigned |

Both assets were produced by one `tauri build` from exact source commit `4137fbe`. The package names, application metadata, architecture, file version, product version, and uninstall registration report v1.9.1/x64. Earlier v1.9.1 candidate assets were moved outside the repository and must not be uploaded.

The standalone build executable is not a publication asset. Tauri applies bundle-specific metadata while creating MSI and NSIS payloads, so installed payload hashes are recorded separately: NSIS `37c47280fced8976fe1e7627e3a771acb8874ee7e0f63dfd9b430eb28054620a`; MSI `c63aae7a6bcaf7a0810a5e508567c4ee496e4fa0d95dd74efb9de3bef1fd438e`. Both installed executables are 7,010,816 bytes and report file/product version 1.9.1.

## Exact-HEAD ReleaseLab Evidence

The final NSIS and MSI matched their expected size and SHA256 after transfer into the isolated Windows guest under `DEVENV\ReleaseLabAdmin`.

- NSIS installation registered and launched v1.9.1.
- Managed Node 20 to Node 22 switching completed through plan, token, execution, and strong verification.
- The managed switch backup restored Node 20.
- A strongly verified external Node 22 installation was adopted into the user environment and restored to managed Node 20.
- SHA256 and size for every file in the external Runtime directory were unchanged after adoption and restore.
- After terminating and restarting DevEnv Manager, ten persistent, restorable switch backups were visible on the first Runtime page load.
- High Contrast Runtime UI rendered with readable controls, plan state, recovery controls, managed rows, and external rows.
- MSI installation returned exit code 0, registered product code `{FC9AB002-A4A7-4801-B40B-1280300FE79B}`, launched v1.9.1, and removed its uninstall registration after silent uninstall.
- The frozen published v1.9.0 NSIS installed successfully and upgraded to v1.9.1 with exit code 0.
- Upgrade preserved the exact settings SHA256 `923239a310c957dc32b9b4faffa8282d1db1d142f7928ff33dfa4deef9622504`.
- Upgrade preserved the exact Profile SHA256 `a19c3715f3b4199c6e6e2ca7313418c1e15280adf8611f94edd6b45b47e93bfe`, and the test Profile remained visible.
- Final cleanup left zero DevEnv Manager processes and zero uninstall registrations, and restored the test user's environment.

Raw evidence is retained in the Git-ignored `artifacts/release-lab/v1.9.1/4137fbe/` directory.

## Non-Blocking Disclosures

- The bundles are not Authenticode-signed. Windows may show its normal trust warning.
- NSIS uninstaller self-removal left normal temporary `~nsu*.tmp` pending-delete records; no DevEnv Manager process, registration, or installed product remained.
- Safe acceptance deliberately does not terminate arbitrary user processes or repeat Windows feature, service, or database mutations.
- Advanced-mode visual and policy behavior remains a manual acceptance item.
- External Runtime adoption changes only the verified user/provider/project selection. It does not add full external installation or uninstall lifecycle.
- Issue #130 remains open for broader Runtime lifecycle work. Issue #133 remains open for the application-internal Acceptance Center. Tracking issues with remaining content must not be closed by this release.

## Release Decision

The reviewed source, assets, CI, Runtime workflow, restart recovery, MSI lifecycle, and v1.9.0 upgrade path have no release blocker. The candidate may proceed through PR merge, target-branch CI, tag, GitHub Release, Gitee Release, online asset verification, and update-channel smoke in that order.
