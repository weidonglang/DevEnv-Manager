# DevEnv Manager v1.9.0 Stable Release Review

Status: **Approved for publication**

The v1.9.0 application source and reviewed assets are pinned to source commit `6e65e8da242fe873077fd207bd2e13a46b2e06b9`. This document is the publication record for the Runtime and Profile-history release.

## User Notice

We apologize for the Runtime state ambiguity, unclear install-versus-switch behavior, Windows Store Alias shims appearing as external Python, and late mixed-language Profile results that remained in earlier candidates. Users should not have needed to repeatedly provide screenshots, reinstall builds, or manually prove these regressions. v1.9.0 corrects the product boundaries and adds automated contracts so these states are checked before release.

## Scope Delivered

- Runtime inventory is organized into JDK, Node.js, Python, Go, Maven, Gradle, Rust/Cargo/rustup, .NET, and other tools.
- Current, DevEnv Manager-managed, and external installations have explicit authority and stable identity. External runtimes remain read-only and cannot be switched or removed by DevEnv Manager.
- Managed JDK, Node, Python, Go, Maven, and Gradle installs verify their version commands and required components before registration. Incomplete targets are retried or quarantined.
- Installing a Runtime never silently changes the active environment. Maven and Gradle expose selected versions; Rust, .NET, and other tools remain read-only discovery in v1.9.0.
- Strong Runtime verification exposes command, file, component, current-pointer, `PATH`, and `JAVA_HOME` evidence. The report can be exported.
- Runtime switching uses a backend-stored exact plan containing the selected target, PATH diff, backup, risk, state fingerprint, expiry, and confirmation token. Tampered, stale, expired, or already-consumed plans are rejected.
- Post-switch verification proves the effective command and required components. Failure keeps backup and rollback evidence.
- Profile history stores full persistent snapshots with a bounded default of 100 entries. Snapshots are recorded before save, delete, rename, copy, import, apply, and restore mutations.
- Profile history restore uses an exact backend plan, state fingerprint, backup snapshot, expiring token, and single consumption.
- Profile operation summaries are localized in Chinese and English.
- WindowsApps Store Alias shims are excluded from external Python Runtime inventory.
- The v1.8.3 port grouping, archive target selection and restore, Recycle Bin rescan, Dark/High Contrast readability, and high-risk plan hardening remain intact.

## Source Freeze Gates

- Rust tests: 216 passed, 0 failed.
- Clippy: `cargo clippy --locked --all-targets -- -D warnings` passed.
- Frontend production build passed with 113 modules.
- Frontend acceptance selectors: 245 passed.
- Visual acceptance: 30 passed, 0 failed.
- Feature acceptance: 292 total; 246 passed, 0 failed, 40 policy skips, and 6 manual/policy records.
- P0 and P1 failures: 0.
- Backend-only, UI-only, missing, partial, and deferred release features: 0.
- Backend/UI drift: 188 registered commands, 154 frontend invokes, 148 manifest commands, and 33 explained backend-only commands.
- Tauri command contract: 146 invokes against 188 registered commands.
- Frontend data, action, quality, localization, architecture, selector, toast-only, safety wording, repository hygiene, update lifecycle, and release contracts passed.
- GitHub Actions runs `30234195428` for PR #138 and `30234718525` for frozen `main` passed.

The 40 safe skips are destructive or privileged actions that the safe acceptance mode deliberately does not repeat. The six manual/policy records cover disposable-process termination, Windows feature/service/database mutation already retained in ReleaseLab evidence, and advanced visual/policy review. They do not represent failed or missing P0/P1 functionality.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.9.0_x64-setup.exe` | 2,887,902 bytes | `0e44e6f9c591858c8981139c581ee70f6e79344b0850525d3f83f2bd257664c1` | NotSigned |
| MSI | `DevEnv.Manager_1.9.0_x64_en-US.msi` | 5,144,576 bytes | `1edf9ccd8a0b4a24e20a874f58c579c3fdb10cf294a917ea3565c2ed4bd1003c` | NotSigned |
| App EXE | `DevEnv.Manager_1.9.0_x64.exe` | 6,871,040 bytes | `66fddcf4fc0a82a3b946cf9254ada9e2b6b30714c135c78741ac1b73097ce3fc` | NotSigned |

All three assets were built once from exact frozen source commit `6e65e8d`. The EXE and NSIS report file and product version 1.9.0. Earlier v1.9.0 candidate assets are superseded and must not be uploaded.

## Exact-HEAD ReleaseLab Evidence

The final NSIS and MSI hashes matched after transfer into the isolated Windows guest. The final NSIS was installed under `DEVENV\ReleaseLabAdmin`:

- Application, file, product, and uninstall registration versions were 1.9.0.
- The installed application exposed its WebView target in approximately 1.44 seconds.
- All nine required Runtime groups rendered; no required group or install group was missing.
- A clean guest reported no external Runtime and no WindowsApps Store Alias Runtime.
- Chinese Profile history restore reported a localized restoration result with no operation or global error.
- English Profile history restore reported a localized restoration result with no operation or global error.
- Profile history increased from 13 to 15 records across the two restore checks.
- Runtime Dark and Profile High Contrast screenshots were readable.
- Final uninstall removed the application registration and install directory and left no application process.

The final source delta after the exact-core Runtime and Profile smoke was frontend localization only. Per the risk-driven policy, the final candidate repeated installation, both languages, the affected Profile result, Runtime inventory, visual themes, and uninstall rather than repeating unrelated UAC workflows. Raw evidence is retained in the Git-ignored `artifacts/release-lab/v1.9.0/6e65e8d/` directory.

## Non-Blocking Disclosures

- The bundles are not Authenticode-signed. Windows may show its normal trust warning.
- Rust, .NET, and other-tool groups are read-only discovery in v1.9.0; their installation lifecycle remains future work.
- Safe acceptance deliberately does not terminate arbitrary user processes or repeat Windows feature, service, and database mutations.
- Advanced-mode visual and policy behavior remains a manual acceptance item.
- Issue #130 should remain open for the read-only ecosystem follow-up and any later Runtime lifecycle expansion. Issues with remaining work must not be closed by this release.

## Publication Plan

1. Merge the release metadata PR and require target-branch CI to pass.
2. Push the exact release commit and annotated `v1.9.0` tag to GitHub and Gitee.
3. Create GitHub and Gitee releases with only the reviewed NSIS and MSI files.
4. Download all four online assets and verify their sizes and SHA256 values.
5. Verify both public update manifests return v1.9.0, x64, the reviewed NSIS identity, and both mirrors.
6. Run an online update-channel smoke.
7. Update this document to `Published and verified` with the online evidence.

## Release Decision

The reviewed source and assets are GO for publication. No source, automated-test, CI, asset, installed-app, or ReleaseLab blocker remains.
