# DevEnv Manager v1.8.2 Release Candidate

v1.8.2 is the first stability-recovery candidate after the Workbench frontend refactor. It restores and hardens core workflows that regressed or lost visible entries after v1.7.0. It does not claim complete restoration of every historical or advanced feature.

## Fixed

- Cleanup disk overview, duplicate large-file scanning, desktop and Downloads archive plans, safe candidate filtering, structured results, and durable errors.
- Ports System, protected, service-owned, database, and user/developer classification; disposable-process plan, token execution, owner re-check, and PID/port release verification.
- File Associations application search lifecycle, expanded change details, Windows UserChoice explanation, backup/rollback evidence, and persistent results.
- Reports Markdown/JSON exports, open-location/copy-summary feedback, and Doctor repair-plan lifecycle and action evidence.
- Environment JAVA_HOME/PATH evidence, Java stabilization result details, JDK 8 jar probe compatibility, and Windows ANSI/OEM output fallback.
- Page-level durable results and errors for core actions that previously depended on transient toast feedback.

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
- Advanced mode policy and remaining visual polish are not treated as complete in this release candidate.
- MySQL repair execution remains manual unless a disposable MySQL fixture is available.

## Release Verification Summary

The aggregate acceptance report contains 212 cases: 181 passed, 0 failed, 26 safely skipped, and 5 manual or deferred. P0 and P1 failure counts are both zero.

- Eleven skipped cases are read-only Tauri commands that require a running backend. Registration, frontend wiring, selectors, and response rendering were checked automatically; the installed Windows smoke covered the release-critical Cleanup, Ports, Reports, Environment, File Associations, Settings, and Update paths.
- Fifteen skipped cases are dry-run or plan commands that require app-specific state or a confirmation token. Static command/argument contracts and plan/result selectors passed; targeted installed smoke created Cleanup, archive, Doctor, Java, File Association, and Ports plans without applying unrelated system changes.
- `ports.planExecuteAndVerify.safeSmoke` is manual in the generic safe runner because process termination must not target arbitrary processes. It was completed against a disposable Python listener, with PID exit, port release, and empty remaining-owner verification.
- `toolchains.mysqlRepair.safeSmoke` remains manual because no disposable MySQL fixture was available. No production MySQL repair was attempted.
- `runtime.v19.fullRedesign` is deferred to #130, `profiles.historyRestore` is deferred until durable history storage exists, and `advanced.mode` remains a P2 visual/policy review item. These do not remove the v1.8.2 core paths listed in the feature comparison above.

Final gates passed: 134 Rust tests, Clippy with warnings denied, the 107-module frontend production build, frontend acceptance with 80 stable selectors, repository hygiene, safety wording, frontend data/action/quality contracts, Tauri command contracts, and GitHub CI quality.

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

## Final RC Candidate Evidence

The following binaries were built from a clean detached worktree at commit `d0686455c0fb4971660456b093bd92aaa00a6df7` and are the only v1.8.2 assets accepted by the RC verification.

| Asset | Size | SHA256 | Verification |
|---|---:|---|---|
| `DevEnv.Manager_1.8.2_x64-setup.exe` | 2,675,263 bytes | `858e128f42b774e41772da9c065596c116812355d90c7943636bfaedded321e7` | v1.7.0 upgrade, installed-app smoke, uninstall, and v1.7.0 rollback passed |
| `DevEnv.Manager_1.8.2_x64_en-US.msi` | 4,517,888 bytes | `ca9f6f0346b68ec4901e18f2d2f499ba0aa053e2f23e6a4503d155d79ca95ac3` | install, installed-app launch, and uninstall passed; Windows Installer status 0 |

Upgrade verification retained the root directory, update sources, theme, safety-disclaimer state, and one existing profile. Cleanup was limited to read-only scans and plan previews. File Associations was limited to search, executable selection, and plan preview. Environment changes, archive execution, cleanup deletion, and association apply were not executed.

The disposable port test terminated only its own Python process and verified `pidExited = true`, `portReleased = true`, and no remaining owner. After NSIS and MSI verification, the machine was restored to the verified v1.7.0 installer. v1.7.0 started with the retained v1.8.2-compatible configuration and opened Environment Doctor, Ports, Space Analysis, File Associations, Runtime, and Update. The final installed version is v1.7.0.

This PR must not create a tag, GitHub Release, or Gitee Release. Those actions require explicit final approval after review.
