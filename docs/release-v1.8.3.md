# DevEnv Manager v1.8.3 Release Candidate Review

Status: **GO for PR review and merge; not published yet**

The public stable channel remains on v1.8.2 until PR #135 is merged, the target-branch CI passes, and the GitHub/Gitee release and online update checks complete. The exact application source and validated local assets below are pinned to commit `152a6d8fbb44d7502b163c2db5eecd89719c7bcc`.

## User Notice

We apologize for the port-scan timeouts, duplicate IPv4/IPv6 rows, unreadable Dark/High Contrast cleanup cards, manual archive-path entry, incomplete Recycle Bin feedback, and mixed-language backend text that remained after v1.8.2. These problems should have been caught before users had to report them. v1.8.3 is a focused corrective release; the larger Runtime redesign remains isolated in #130 for v1.9.0.

## Scope Delivered

- Port scanning now uses a bounded quick snapshot plus asynchronous enrichment, single-flight execution, caching, last-success fallback, force refresh, cancellation, and structured source diagnostics.
- Equivalent IPv4/IPv6 bindings and duplicate source records render as one stable group without losing endpoint evidence.
- Process identity uses executable, service, path, command line, parent, metadata, publisher, and port evidence. Service-owned and protected Windows targets remain outside ordinary force-kill actions.
- Desktop archive uses recommended volumes or a directory picker, then plan, token, copy/hash verification, receipt, rollback, and partial-failure restoration.
- Recycle Bin cleanup has a separate snapshot, volume selection, plan/token execution, post-clean rescan, and durable result/error area. A terminal `ERROR_FILE_NOT_FOUND` is accepted only when the authoritative rescan proves the selected scope is empty and every planned item disappeared.
- Cleanup cards use theme tokens and remain readable in Light, Dark, System, and High Contrast layouts.
- English UI output routes additional cleanup, archive, environment, and verification backend text through the localization adapter.
- Visual acceptance is time-bounded and reports each case, preventing a stalled Edge probe from hanging CI indefinitely.

## Automated Gates

- Rust tests: 204 passed, 0 failed.
- Clippy: `cargo clippy --locked --all-targets -- -D warnings` passed.
- Formatting: `cargo fmt --all -- --check` passed.
- Frontend production build passed.
- Frontend acceptance found 228 stable selectors.
- Static acceptance: 69 total, 66 passed, 0 failed, 2 safely skipped, 1 manual/deferred.
- Safe acceptance: 212 total, 167 passed, 0 failed, 38 safely skipped, 7 manual/deferred.
- Frontend mode: 2 passed, 0 failed.
- Aggregate report: 283 total, 235 passed, 0 failed, 40 safely skipped, 8 manual/deferred.
- Automated visual acceptance: 30/30 passed across Light, Dark, System, High Contrast, Chinese/English, compact/wide, and high-DPI cases.
- Backend/UI drift, frontend data/action/quality/i18n, toast-only, Tauri command, repository hygiene, safety wording, release consistency, and process-identity catalog checks passed.
- GitHub Actions run `29921296085` passed for exact HEAD `152a6d8`.

The 40 skipped records require a real Tauri process, installed Windows state, privileged/destructive mutation, or another explicitly unavailable boundary; none is counted as passed. The eight manual/deferred records include the v1.9.0 Runtime redesign, Profile history storage, advanced-mode policy, and final publication/online-channel checks. They do not remove or weaken a v1.8.3 feature assertion.

## Exact Asset Identity

| Bundle | File | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv Manager_1.8.3_x64-setup.exe` | 2,836,506 bytes | `aecafb9614179bbb480e6315f9903b9c228ce71669136a0ef40e1d12305466a6` | NotSigned |
| MSI | `DevEnv Manager_1.8.3_x64_en-US.msi` | 5,058,560 bytes | `4b90b271b93620ebb66eb25ce46bfd815a7ddcc392a03c67849590ec6fd06452` | NotSigned |
| App EXE | `dailytools-tauri.exe` | 6,722,560 bytes | `ce01955c5d2ebe006904ec3fd0ca000c05872acee2fbcb6835da825141df90a5` | NotSigned |

The files are x64 and report product version 1.8.3 where the format exposes product-version metadata. They are local validated candidates, not online release assets yet. Earlier v1.8.3 candidate hashes are superseded and must not be uploaded.

## Installed ReleaseLab Evidence

The exact assets above were tested in `DevEnv-Manager-ReleaseLab-2` under local administrator `DEVENV\ReleaseLabAdmin`:

- Fresh NSIS install, launch, About 1.8.3, no global error, no blank toast, uninstall, and configuration retention passed.
- Fresh MSI install, launch, About 1.8.3, ProductCode `{358FD189-5D64-4664-8D01-0E70B17D3AAA}`, uninstall, and configuration retention passed.
- v1.8.2 to v1.8.3 upgrade passed with settings and `ReleaseLab-v1.8.3-Upgrade-Profile` visible and hash-preserved.
- A 120-listener dual-stack load produced 240 sockets without timeout. Ports 5432, 5173, and 8080 each rendered as one IPv4+IPv6 group with PostgreSQL, Node.js, and Java identity evidence.
- Desktop analyze, select, plan, execute, hash verification, rollback, and source restoration passed.
- A disposable E: Recycle Bin fixture completed preview, plan, token, execution, authoritative rescan, zero remaining items, and source removal with no persistent error.
- Six exact-HEAD screenshots and all 13 functional assertions passed, including Dark/High Contrast card geometry.
- Final cleanup left zero app registrations, app/test processes, and ReleaseLab scheduled tasks. Relevant application error events were zero.
- Settings SHA256 remained `6ba5fc215ab0d4ce08ece1d5c8835d57248cb6f4dec3b7e0d2dd5cfd73cd4e9d`; Profile SHA256 remained `44f68bda7bdd4299ab5761547a304fdbb8768438ba7c388bb80a8202cab7a00a`.
- The Guest test root was removed and the dedicated 1 GiB VHD was detached.

Raw evidence is retained under the Git-ignored `artifacts/release-lab/v1.8.3/152a6d8/` directory. `installed-lifecycle.json`, `functional-validation.json`, and `final-cleanup.json` identify the exact source commit and preserve the detailed machine evidence.

## Non-Blocking Disclosures

- The local bundles are not Authenticode-signed, matching the current project distribution model. Users may receive the normal Windows trust warning.
- `PendingFileRenameOperations` contains only Microsoft Edge update paths and repeated `~nsu1.tmp` cleanup paths created by the isolated install/uninstall loop. There are zero unclassified entries, no remaining DevEnv Manager registration/process, and no related application error event.
- `runtime.v19.fullRedesign`, `profiles.historyRestore`, and `advanced.mode` remain explicitly deferred. Their issues must stay open.

## Review Decision

No application, installer, acceptance, CI, or ReleaseLab blocker remains for moving PR #135 from Draft to review and merge. Publication is not authorized by this document alone: the remaining operations are repository and online-release gates.

Required order:

1. Commit this evidence update and require latest-head PR CI to pass.
2. Perform an independent code, security-boundary, evidence, metadata, and asset review.
3. Mark PR #135 ready and merge it only after that review is GO.
4. Require the target `main` CI to pass.
5. Pin the validated NSIS/MSI identities, create and push tag `v1.8.3`, and create the GitHub Release.
6. Upload only the reviewed NSIS/MSI assets and verify online size/SHA256.
7. Create/synchronize the Gitee Release and verify its online size/SHA256.
8. Switch `README.md`, `CHANGELOG.md`, `update-manifest.json`, and `update-manifest.cn.json` from v1.8.2 to the verified v1.8.3 URLs and SHA256 values.
9. Run an update-channel smoke from v1.8.2 against GitHub and Gitee.
10. Close #134 only after both platforms and the update channel pass; keep #130 and other deferred tracking issues open.
