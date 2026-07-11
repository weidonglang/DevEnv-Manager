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

## Rollback Baseline

- Download: https://github.com/weidonglang/DevEnv-Manager/releases/download/v1.7.0/DevEnv.Manager_1.7.0_x64-setup.exe
- SHA256: `6b88d7ca812770ca032ff331c4f0916b1ec7282eb9cdf6cea0c32dc79d3ab711`

The v1.7.0 installer was freshly downloaded and its SHA256 re-verified during #132 RC closure. Before rollback, back up `%LOCALAPPDATA%\DevEnvManager\settings.json`. Uninstall v1.8.2, install the verified v1.7.0 package, then confirm the saved root directory and update-source settings load normally.

## Pre-final RC Candidate Evidence

- Filename: `DevEnv.Manager_1.8.2_x64-setup.exe`
- Size: `2675025`
- SHA256: `fe636863f9dd0784ad463c717f1d74466a54cc87b61760fc7b7b683f6d4fe407`
- Built from commit: `d29d08a845e7ad2b5c0d2db24d8ad6d2fa56cac1` plus the reviewed v1.8.2 version metadata in this RC batch
- Install verified: pending
- Launch verified: pending
- Upgrade from v1.7.0: pending
- Rollback to v1.7.0: pending

This hash identifies the pre-final candidate built before the CI locale fix and release-metadata commit. It is retained only as traceable RC evidence and must not be used as the final release hash. Final NSIS and MSI metadata will be recorded after authorized upgrade and rollback verification and a clean rebuild from the final commit.

This PR must not create a tag, GitHub Release, or Gitee Release. Those actions require explicit final approval after review.
