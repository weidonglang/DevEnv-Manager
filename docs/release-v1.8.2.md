# DevEnv Manager v1.8.2 Stable Release

v1.8.2 is the stability-recovery release after the Workbench frontend refactor. The v1.7.0 audit accounts for all 237 source records as 87 user capabilities: 74 equivalent and 13 enhanced, with no missing or degraded historical capability. New v1.9.0 redesign work remains separately tracked.

## Fixed

- Cleanup disk overview, duplicate large-file scanning, desktop and Downloads archive plans, safe candidate filtering, structured results, and durable errors.
- Ports System, protected, service-owned, database, and user/developer classification; disposable-process plan, token execution, owner re-check, and PID/port release verification.
- File Associations application search lifecycle, expanded change details, Windows UserChoice explanation, backup/rollback evidence, and persistent results.
- Reports Markdown/JSON exports, open-location/copy-summary feedback, and Doctor repair-plan lifecycle and action evidence.
- Environment JAVA_HOME/PATH evidence, Java stabilization result details, JDK 8 jar probe compatibility, and Windows ANSI/OEM output fallback.
- Page-level durable results and errors for core actions that previously depended on transient toast feedback.
- Dynamic backend diagnostics, cleanup reasons, environment plans, Python guidance, runtime verification, and Dashboard health now follow the selected English/Chinese locale.
- Cleanup summaries and local-service tables use theme tokens in Dark and High Contrast modes instead of fixed light colors.
- External runtime probes suppress native Windows loader-error dialogs and report failures inside the workbench without blocking navigation.

## Safety

- PID 4, System, protected processes, service-owned processes, and targets without a verified executable cannot enter the ordinary force-termination branch.
- Cleanup protected paths remain outside execution plans. Duplicate scanning defaults to bounded user locations instead of the system drive root.
- Risk, token, plan fingerprint, owner re-check, backup/receipt, verification, and rollback boundaries remain enforced.
- Learning Center remains limited to its read-only command allowlist.

## v1.7.0 Feature Comparison

The golden pre-refactor baseline is commit `55f4a6cfc2d91582f20566b813d4706af4ef8d4a` and installer `DevEnv.Manager_1.7.0_x64-setup.exe`.

| v1.7.0 entry | v1.8.2 entry | Evidence-based status |
|---|---|---|
| Overview | Dashboard | Present; snapshot, effective tools, root, update, doctor, environment, ports, and report actions. |
| Environment Doctor | Reports | Present; Doctor run, Markdown/JSON export, copy/open, repair plan and durable result. |
| Ports | Ports & Services | Present and hardened; row classification, plan/token/execute/verify. |
| Version Management | Runtimes | Present; managed/external action boundary retained. Final Runtime redesign remains #130. |
| Environment | Environment | Present; reliability evidence, JDK selection, Java plan, PATH cleanup, report export. |
| Project | Projects | Present; analysis, config preview/apply, ports, IDEA inspection, Java consumer verification. |
| Toolchains | Toolchains | Present; toolchains, platforms, services, MySQL, and read-only learning command entry. |
| Platform / Mirrors | Toolchains | Replacement entry; platform inspection and ecosystem/mirror actions are grouped under Toolchains. |
| Learning Center | Toolchains | Replacement entry; read-only learning command and boundary are retained. |
| Space Analysis | Cleanup | Present; cleanup, large files, duplicates, disk overview, archive, move, rollback, and expansion. |
| Toolbox | File Associations / Toolchains / Settings / Reports | Replacement entries; file associations are first-class, system/platform tools are under Toolchains, update/debug under Settings, and exports under Reports. |
| Profiles inside Environment | Profiles | Present as a first-class page with save/copy/rename/import/export/plan/execute/delete actions. |
| GitHub/Gitee update fallback | Settings | Present; selected source, source URL, mirrors, and failed-source evidence are rendered. |

## Known Limitations

- Runtime full redesign, unified multi-version verification, and expanded Maven/Gradle version selection remain tracked by #130 for v1.9.0.
- Profile history restore remains deferred until durable backend history storage and commands exist.
- Advanced mode policy and non-blocking visual polish remain follow-up work.
- Safe-mode automation does not repeat destructive database, service, Windows-feature, or partition mutations. Those paths have retained disposable ReleaseLab/UAC evidence.

## Release Verification Summary

The aggregate acceptance report contains 283 cases: 240 passed, 0 failed, 36 safely skipped, and 7 manual or deferred. P0 and P1 failure counts are both zero.

- Eleven skipped cases are read-only Tauri commands that require a running backend. Registration, frontend wiring, selectors, and response rendering were checked automatically; the installed Windows smoke covered the release-critical Cleanup, Ports, Reports, Environment, File Associations, Settings, and Update paths.
- Fifteen skipped cases are dry-run or plan commands that require app-specific state or a confirmation token. Static command/argument contracts and plan/result selectors passed; targeted installed smoke created Cleanup, archive, Doctor, Java, File Association, and Ports plans without applying unrelated system changes.
- `ports.planExecuteAndVerify.safeSmoke` is manual in the generic safe runner because process termination must not target arbitrary processes. It was completed against a disposable Python listener, with PID exit, port release, and empty remaining-owner verification.
- `toolchains.mysqlRepair.safeSmoke`, `services.manage.safeSmoke`, and `platforms.manage.safeSmoke` remain manual in the generic safe runner so CI never mutates a developer machine. Disposable ReleaseLab fixtures verified MySQL schema repair and data preservation, service stop/port release, and the WSL platform change with its pending-reboot result.
- `runtime.v19.fullRedesign` is deferred to #130, `profiles.historyRestore` is deferred until durable history storage exists, and `advanced.mode` remains a P2 visual/policy review item. These do not remove the v1.8.2 core paths listed in the feature comparison above.

Final gates passed: 154 Rust tests, Clippy with warnings denied, the 110-module frontend production build, frontend acceptance with 195 stable selectors, 648 aligned English/Chinese locale keys across 36 UI/event sources, repository hygiene, safety wording, frontend data/action/quality contracts, Tauri command contracts, and release-disposition checks.

The isolated UAC batch also verified C-drive growth of 883,932,672 bytes with healthy NTFS, MySQL system-schema restoration with preserved `ibdata1` and business-data hashes, service stop with port release, and the VirtualMachinePlatform state change. After the batch, the VM checkpoint restoration was verified by exact C/recovery partition geometry, fixture removal, closed application state, and a settings SHA256 match. Profile presence was not part of that checkpoint's preflight scope; independent N3/N4/N5 upgrade and rollback evidence covers Profile preservation.

The rollback evidence is anchored to the pre-upgrade baseline and final machine state:

| Evidence | Before upgrade | After final rollback |
|---|---:|---:|
| Installed version | 1.7.0 | 1.7.0 |
| Settings size | 950 bytes | 950 bytes |
| Settings SHA256 | `8fd1d16130effb597ea451b0f93beb344b4e496bec98e51e5c118028dc3c2235` | `8fd1d16130effb597ea451b0f93beb344b4e496bec98e51e5c118028dc3c2235` |
| Profiles | 1 | 1 |
| Application process | closed | closed |

## Rollback Baseline

- Download: https://github.com/weidonglang/DevEnv-Manager/releases/download/v1.7.0/DevEnv.Manager_1.7.0_x64-setup.exe
- SHA256: `6b88d7ca812770ca032ff331c4f0916b1ec7282eb9cdf6cea0c32dc79d3ab711`

The v1.7.0 installer was freshly downloaded and its SHA256 re-verified during #132 RC closure. Before rollback, back up `%LOCALAPPDATA%\DevEnvManager\settings.json`. Uninstall v1.8.2, install the verified v1.7.0 package, then confirm the saved root directory and update-source settings load normally.

## Final Release Assets

The publishable binaries were built from code commit `3cc7da070a2e8b3589c7ddbdae8b40aaa9f704ff`. The final metadata commit only updates release documentation and update manifests and does not alter the product binary.

| Bundle | File | Size | SHA256 |
|---|---|---:|---|
| NSIS | `DevEnv.Manager_1.8.2_x64-setup.exe` | 2,775,318 bytes | `b910f56674abca837baaff662e159d6025d66dce933c2f758af34211a27e49a6` |
| MSI | `DevEnv.Manager_1.8.2_x64_en-US.msi` | 5,001,216 bytes | `45af2f82e4e3d093e62014057b2816b8372909ddbd78adbe98343c59f425de37` |

The NSIS was copied into the disposable ReleaseLab guest, matched the expected SHA256, silently replaced the prior RC with exit code 0, registered version 1.8.2, and started a responsive process in the interactive desktop session. The final user visual pass reported no release-blocking problem after the Dark/High Contrast and bilingual fixes.

All earlier v1.8.2 RC assets, including hashes beginning `858e128`, `ca9f6f0`, `6d4d4ed`, `d83d83c`, `3ef7357`, `6bc11a3`, `b46c460`, and `58f7b05`, are superseded and must not be uploaded.

Upgrade verification retained the root directory, update sources, theme, safety-disclaimer state, and one existing profile. Cleanup was limited to read-only scans and plan previews. File Associations was limited to search, executable selection, and plan preview. Environment changes, archive execution, cleanup deletion, and association apply were not executed.

The disposable port test terminated only its own Python process and verified `pidExited = true`, `portReleased = true`, and no remaining owner. After NSIS and MSI verification, the machine was restored to the verified v1.7.0 installer. v1.7.0 started with the retained v1.8.2-compatible configuration and opened Environment Doctor, Ports, Space Analysis, File Associations, Runtime, and Update. The final installed version is v1.7.0.

Publication order is merge #132, verify main CI, push tag `v1.8.2` to GitHub and Gitee, create both releases with these exact assets, verify online size/SHA256, and run the update-channel smoke.
