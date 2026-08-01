# DevEnv Manager v1.9.3 Stable Release Review

Status: **Release candidate verified; publication pending**

The v1.9.3 product source and reviewed assets are pinned to source commit `8161743`. This document records the workflow-feedback fixes, exact assets, automated gates, real-Tauri smoke, publication boundaries, and remaining follow-up work.

## User Notice

We apologize to users who clicked an action and could not tell where its plan or result appeared, could not determine whether a Runtime health check passed, or reasonably concluded that Project, Ports, File Associations, or Cleanup actions had not responded. Durable operation feedback is a product requirement, not optional decoration. v1.9.3 makes these workflows visible and discoverable without weakening existing safety contracts.

## Scope Delivered

- Runtime health checks now retain a summary and per-runtime healthy/needs-attention status, required-check counts, and failure details.
- Runtime row health checks select the target and reveal the shared health result.
- Project analysis, preview, apply, port inspection, IDEA inspection, Java verification, and trace inspection distinguish loading, success, empty, and failed states.
- Changing the project path clears stale results, and a preview created for another project cannot be applied.
- Ports retain the complete connection and protocol view by default, with an optional actionable-listener filter.
- Eligible listening ports expose a shortcut that creates the existing guarded plan; execution still requires the normal plan, token, owner re-check, and release verification.
- File Association search normalizes bare suffixes such as `txt` to `.txt` and retains scan, app-search, plan, apply, rollback, settings, and export results.
- Cleanup scan results and plans appear beside the initiating controls, archive/cache workflows are separated, and Recycle Bin cleanup is presented as refresh, select, plan, and execute steps.
- Newly created plans, durable errors, and results are automatically revealed and focused across the affected pages.
- Focused workflow-feedback acceptance and the complete Edge visual matrix cover the changed behavior.

## Source Freeze Gates

- Exact product source: `8161743f100c975addd281ee08c24541ef3178e0`.
- Rust tests: 230 passed, 0 failed.
- Clippy: `cargo clippy --all-targets --all-features -- -D warnings` passed.
- Rust formatting: passed.
- Frontend production build: 113 modules passed.
- Frontend acceptance selectors: 278 passed.
- Edge visual acceptance: 30 passed, 0 failed, release blocking false.
- Workflow feedback acceptance: passed.
- Feature acceptance: 300 total; 254 passed, 0 failed, 40 policy skips, and 6 manual/policy records.
- P0 and P1 failures: 0.
- Backend-only, UI-only, missing, partial, deferred, and toast-only release features: 0.
- Backend/UI drift: 191 registered commands, 158 frontend invokes, and 152 manifest commands.
- Tauri command, frontend data/action/quality/localization, safety wording, repository hygiene, architecture, and release contract gates passed.

The 40 safe skips are destructive, privileged, or installed-application actions that safe mode deliberately does not repeat. The six manual/policy records remain documented policy boundaries and do not represent failed or missing P0/P1 functionality.

## Real Tauri Workflow Smoke

The final release executable was launched without UAC while the user's installed DevEnv Manager process remained untouched. The smoke verified:

- the release executable stayed running and rendered the Settings page;
- About and footer reported version 1.9.3 and Windows x64;
- the existing stable update channel remained readable as v1.9.2 before publication;
- Runtime loaded real machine data without a global or page load failure;
- Runtime showed 2 managed and 25 external discoveries;
- the health result showed 20 of 27 runtimes passing every required check;
- each visible result distinguished `Healthy` from `Needs attention`, included required-check counts, and listed failed checks;
- the dedicated smoke process was closed afterward and the user's installed application process remained running.

No UAC prompt, installer lifecycle, environment mutation, Runtime switch, port termination, file-association write, cleanup deletion, service mutation, database repair, or disk operation was used.

Raw evidence is retained in the Git-ignored `artifacts/release-lab/v1.9.3/8161743/` directory.

## Exact Asset Identity

| Bundle | Publication file | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv.Manager_1.9.3_x64-setup.exe` | 2,958,792 bytes | `55674a8f6fae2b30ac1649f09066b29ae5c8822fbd77286c4e422f7892292118` | NotSigned |
| MSI | `DevEnv.Manager_1.9.3_x64_en-US.msi` | 4,943,872 bytes | `81602c1c65c2c3674bab6e2a3c532533f2bde8da6a0c5d3d7267c763d5238ac5` | NotSigned |

Both assets were produced by one `tauri build` from exact source commit `8161743`. The release executable is 7,014,912 bytes, has SHA256 `534ee5e03b6d65fe927c3b68df5e147a430a2ee9dd32611738daf5fefa99d7be`, and reports file and product version 1.9.3. MSI metadata reports product name `DevEnv Manager`, product version 1.9.3, x64 architecture, and ProductCode `{A060CD91-27A8-411E-814A-1C7437D8F937}`.

Only the two installer files in this table are publication assets.

## Risk-Driven Validation Boundary

This release changes frontend workbench state, navigation, result rendering, selectors, visual baselines, and version metadata. It does not change installer behavior, startup configuration paths, configuration migration, backend mutation commands, token contracts, environment writes, Runtime mutation execution, service mutation, database repair, or disk execution.

Accordingly, unrelated UAC and full installer lifecycle cases were not repeated. The previously published installation, upgrade, uninstall, settings preservation, Profile preservation, Runtime switch, service, database, and disk evidence remains applicable. The final v1.9.3 asset metadata and exact release executable were checked directly, and the affected Runtime feedback path was exercised against the real Tauri backend.

## Non-Blocking Disclosures

- The bundles are not Authenticode-signed. Windows may show its normal trust warning.
- The production Java inventory on the smoke machine contains several external JDK/JRE entries that fail one or more required checks; v1.9.3 now reports those failures instead of hiding them.
- Safe acceptance does not terminate arbitrary user processes or repeat destructive, privileged, service, database, or disk operations.
- Issue #130 remains open for broader Runtime lifecycle and ecosystem work.
- Issue #133 remains open for the application-internal Acceptance Center.
- Tracking issues with remaining content are not closed by this release.

## Publication Verification

- PR #146 CI run `30692122294` passed before merge, including Rust tests, formatting, Clippy, frontend build, static/safe/frontend acceptance, Edge visual acceptance, report generation, and repository hygiene.
- Release PR, target-main CI, tag, GitHub Release, Gitee Release, online asset hashes, and update-channel smoke will be recorded after publication.

## Release Decision

The reviewed source and assets are ready to enter the PR, target-main CI, tag, and dual-platform publication sequence. Publication is not complete until both platforms and the online update channel are verified.
