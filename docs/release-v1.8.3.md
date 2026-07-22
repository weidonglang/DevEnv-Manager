# DevEnv Manager v1.8.3 Stable Release Review

Status: **Published and verified on GitHub and Gitee**

The public stable channel is v1.8.3. PR #135 was merged as `921b9daf05d0781ed1028d6dfc6d99b4d320932c`; the exact application source and locally validated assets are pinned to source commit `ef89b71b91dd550d40c21e4f05cf3f32a52c9252`.

## User Notice

We apologize for the port-scan timeouts, duplicate IPv4/IPv6 rows, unreadable Dark and High Contrast cleanup cards, manual archive target entry, incomplete Recycle Bin feedback, mixed-language output, and plan safety gaps that remained after v1.8.2. Users should not have had to repeatedly report these problems. v1.8.3 is a focused corrective release; the larger Runtime redesign remains isolated in #130 for v1.9.0.

## Scope Delivered

- Port scanning now uses a bounded quick snapshot plus asynchronous enrichment, single-flight execution, caching, last-success fallback, force refresh, cancellation, and structured source diagnostics.
- Equivalent IPv4/IPv6 bindings and duplicate source records render as one stable group without losing endpoint evidence. Non-listening connections remain read-only.
- Process identity combines executable, service, path, command line, parent, metadata, publisher, and port evidence. Service-owned and protected Windows targets stay outside ordinary force-kill actions.
- Desktop and Downloads archive flows automatically recommend eligible non-system volumes and also provide a directory picker. Plans enumerate exact source/target paths, byte sizes, and SHA256 values before execution.
- Cross-volume archive execution uses copy, hash verification, and source deletion. Desktop and Downloads both expose durable restore actions and verified rollback receipts.
- Move, expansion, and file-association execution now use backend-stored exact plans with expiry, bounded pending-plan storage, tamper rejection, and single consumption. Partition layout is revalidated immediately before expansion.
- Junction creation now fails closed if its rollback record cannot be persisted, restoring the original source instead of leaving an untracked junction.
- Recycle Bin cleanup has a separate snapshot, volume selection, plan/token execution, post-clean rescan, and durable result/error area.
- Cleanup cards use theme tokens and remain readable in Light, Dark, System, and High Contrast layouts.
- English UI output routes additional cleanup, archive, environment, and verification backend text through the localization adapter.
- Visual acceptance is time-bounded and reports each case so a stalled Edge probe cannot hang CI indefinitely.

## Source Freeze Gates

- Rust tests: 211 passed, 0 failed.
- Clippy: `cargo clippy --locked --all-targets -- -D warnings` passed.
- Frontend production build passed with 113 modules.
- Static feature acceptance: 69 total, 66 passed, 0 failed, 2 explicitly deferred, 1 manual visual item.
- P0 failures: 0. P1 failures: 0. Backend-only, UI-only, missing, and partial release features: 0.
- 165 P0/P1 frontend selectors passed.
- Backend/UI drift, frontend data/action/quality/i18n/architecture, toast-only, Tauri command, safety wording, repository hygiene, update lifecycle, platform, service, environment, runtime, cleanup, and security contract checks passed.
- GitHub Actions run `29925410879` passed for exact source commit `ef89b71`.

The two deferred records are the v1.9.0 Runtime redesign and Profile history storage. The manual record is the advanced visual/policy review. None removes or weakens a v1.8.3 feature assertion.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.8.3_x64-setup.exe` | 2,841,914 bytes | `a6663ab2e409f936b11105f4d827b4d41cbfbe9e225ce55aa7a92e4eb601d20c` | NotSigned |
| MSI | `DevEnv.Manager_1.8.3_x64_en-US.msi` | 5,066,752 bytes | `fa662e1121fea9fee4334f9d098412434c006f3db054bd8614831d7816b81df2` | NotSigned |
| App EXE | `dailytools-tauri.exe` | 6,739,968 bytes | `3cacd788f91c83bc017d587965a32f9d5e577c32de1b04f539831b48548117fb` | NotSigned |

All assets were produced once from a clean exact HEAD after source freeze. The x64 EXE and NSIS report product version 1.8.3. The publication copies only normalize spaces in the generated bundle names; their bytes and hashes are unchanged. Earlier v1.8.3 candidate hashes are superseded and must not be uploaded.

## Exact-HEAD ReleaseLab Evidence

The final NSIS was copied to `DevEnv-Manager-ReleaseLab-2`, matched its expected size and SHA256, and was installed under `DEVENV\ReleaseLabAdmin`:

- Install registration and application product version were 1.8.3.
- The installed EXE was 6,739,968 bytes with SHA256 `0ec4700df7ef7615813b0f35dd96c8f3389f8d859c8e82a48419a05eef63def8`. The installed payload identity is recorded separately from the build-tree EXE, matching the established Tauri/NSIS evidence model.
- The interactive application exposed its WebView target in 1,793 ms, rendered without a global persistent error, and suppressed blank toasts.
- A 120-listener dual-stack fixture produced 240 sockets. The final full scan completed from `netstat` in 59 ms, retained 304 of 311 raw records, and showed ports 5432, 5173, and 8080 as one IPv4+IPv6 group each.
- All 15 final assertions passed: dashboard visibility, port timeout/grouping/identity checks, Dark and High Contrast card geometry, Desktop archive/restore, Downloads archive/restore, Recycle Bin preview/plan/execution/rescan, and terminal fixture removal.
- Desktop and Downloads source files were restored with their original SHA256 values.
- Seven exact-HEAD screenshots were captured, including Dark, High Contrast, Downloads restore, and Recycle Bin terminal state.
- Final cleanup returned NSIS uninstall exit code 0 and left no DevEnv registration, app/test process, ReleaseLab task, fixture file, Guest test root, attached test VHD, or VHD file.

No installer or configuration-path source changed after the earlier v1.8.3 dual-installer and upgrade evidence. Per the risk-driven release policy, the exact final candidate therefore repeated one complete NSIS installation plus affected feature workflows instead of repeating the full MSI/NSIS/upgrade matrix. The final MSI itself is still pinned by the clean-build size and SHA256 above.

Raw evidence is retained under the Git-ignored `artifacts/release-lab/v1.8.3/ef89b71/` directory. `preflight.json`, `functional-prepare.json`, `functional-validation.json`, and `final-cleanup.json` identify the exact source commit and preserve the machine results.

## Publication Verification

- PR #135 and `main` CI run `29928050840` passed before publication.
- Annotated tag `v1.8.3` was pushed to GitHub and Gitee from merge commit `921b9da`.
- [GitHub Release](https://github.com/weidonglang/DevEnv-Manager/releases/tag/v1.8.3) and [Gitee Release](https://gitee.com/weidonglang/DevEnv-Manager/releases/tag/v1.8.3) are public and contain the reviewed NSIS and MSI assets.
- The NSIS and MSI were independently downloaded from both platforms. All four online files matched the reviewed sizes and SHA256 values in this document.
- GitHub and Gitee public manifests both returned version 1.8.3, the expected x64 NSIS file name, 2,841,914-byte size, and SHA256 `a6663ab2e409f936b11105f4d827b4d41cbfbe9e225ce55aa7a92e4eb601d20c`.
- A real v1.8.2 application checked both online channels. GitHub completed in 277 ms and Gitee in 460 ms; both returned `currentVersion=1.8.2`, `latestVersion=1.8.3`, `updateAvailable=true`, and the expected URL, mirrors, platform, size, and SHA256.
- The update-smoke v1.8.2 install and uninstall both returned exit code 0.
- Issue #134 was closed only after these online checks passed. Issue #130 remains open for v1.9.0 Runtime work.

## Non-Blocking Disclosures

- The bundles are not Authenticode-signed, matching the current project distribution model. Windows may show its normal trust warning.
- `runtime.v19.fullRedesign`, `profiles.historyRestore`, and `advanced.mode` remain explicitly deferred. Their issues must stay open.

## Release Decision

v1.8.3 is released. No source, automated-test, CI, asset, installed-app, ReleaseLab, publication, or update-channel blocker remains. All earlier v1.8.3 candidate assets remain superseded and must not be distributed.
