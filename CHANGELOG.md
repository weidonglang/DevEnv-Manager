# Changelog

## 1.9.1

- Fix managed Runtime switching that could appear unresponsive by adding durable row-level preparation, plan, execution, verification, error, and result states.
- Resolve every switch target from a backend-trusted stable Runtime ID instead of accepting frontend-provided kind, version, or path identity.
- Allow strongly verified external JDK, Python, Node.js, Go, Maven, and Gradle installations to be adopted into the user environment without modifying or uninstalling their directories.
- Add provider-aware switching for nvm, fnm, Volta, Scoop, and rustup, plus project-scoped .NET SDK selection through `global.json`.
- Persist exact switch plans, environment diffs, backups, fingerprints, expiring confirmation tokens, single-use state, verification evidence, rollback results, and recovery guidance.
- Restore persistent Runtime backup choices on initial page load after the application restarts.
- Add focused acceptance and isolated Windows ReleaseLab coverage for managed switching, external adoption, restart recovery, MSI lifecycle, and v1.9.0 upgrade preservation.

Exact asset identities, test evidence, acceptance boundaries, and disclosures are recorded in [docs/release-v1.9.1.md](docs/release-v1.9.1.md).

## 1.9.0

- Redesign Runtime discovery around nine ecosystem groups with explicit current, managed, and external authority boundaries.
- Keep external runtimes read-only and prevent managed JDK, Node, Python, Go, Maven, and Gradle installs from silently changing the active environment.
- Verify installed runtime commands and required components before registration, with retry and quarantine handling for incomplete targets.
- Add selectable Maven and Gradle versions plus structured strong-verification results and report export.
- Bind Runtime switching to backend-stored exact plans with PATH diffs, backups, state fingerprints, expiring confirmation tokens, single consumption, stale-state rejection, post-switch verification, and rollback evidence.
- Persist up to 100 complete Profile history snapshots and protect restore with the same plan, fingerprint, backup, token, and single-use boundaries.
- Localize Profile operation summaries in Chinese and English, including save, delete, rename, copy, import, export, apply, and history restore.
- Exclude WindowsApps Store Alias shims from external Python Runtime inventory.
- Preserve the v1.8.3 port, cleanup, archive, Recycle Bin, contrast, and high-risk plan hardening.

Exact asset identities, ReleaseLab evidence, acceptance boundaries, and disclosures are recorded in [docs/release-v1.9.0.md](docs/release-v1.9.0.md).

## 1.8.3

- Group IPv4/IPv6 and duplicate source records into one stable visible port row while preserving every binding in diagnostics.
- Keep port selection stable across quick scan and enrichment generations, reject stale owners, and verify target and related-port release after execution.
- Expand Windows service-host evidence with service names, display names, host groups, executable paths, and ServiceDLL details.
- Replace manual archive target entry with eligible-volume recommendations, selectors, and a directory picker; revalidate absolute non-system targets before execution.
- Add snapshot-based Windows Recycle Bin inspection, volume selection, plan/token execution, post-clean rescan, and persistent result/error panels.
- Correct Dark and High Contrast cleanup card readability and add automated layout, contrast, overflow, localization, and screenshot regression checks.
- Add an About panel sourced from build metadata and translate additional backend cleanup/archive guidance in the English interface.
- Harden acceptance reporting so deferred/manual work is not counted as passed and stale reports cannot contaminate a current release result.
- Bind move, partition expansion, and file-association execution to backend-stored exact plans with expiry, tamper rejection, bounded storage, and single consumption.
- Enumerate exact Desktop and Downloads archive files at preview time, verify cross-volume copies by SHA256 before deleting sources, and expose verified restore actions for both workflows.
- Fail junction creation closed when rollback evidence cannot be persisted, restoring the original source instead of leaving an untracked junction.

Exact asset identities and ReleaseLab evidence are recorded in [docs/release-v1.8.3.md](docs/release-v1.8.3.md).

## 1.8.2 Stable

- Restored and hardened the Cleanup, Ports, Environment, Reports, and File Associations workflows affected by the Workbench frontend refactor.
- Added durable page-level results and errors for core actions that previously relied on transient notifications.
- Added feature acceptance, backend/frontend drift, selector, toast-only, data-contract, safety, and repository-hygiene gates.
- Hardened protected-process handling, token-gated execution, owner re-checks, backup evidence, verification, and rollback boundaries.
- Made Windows ANSI output decoding independent of the runner's active system locale, with GBK and Windows-1252 regression coverage.

Known limitations and the evidence-based comparison with v1.7.0 are documented in [docs/release-v1.8.2.md](docs/release-v1.8.2.md). Runtime architecture redesign remains tracked by #130 for v1.9.0.

## 1.8.1

- Published the Workbench stability hotfix. See [docs/release-v1.8.1.md](docs/release-v1.8.1.md).
