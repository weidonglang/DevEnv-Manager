# Changelog

## 1.8.3 (Unreleased)

- Group IPv4/IPv6 and duplicate source records into one stable visible port row while preserving every binding in diagnostics.
- Keep port selection stable across quick scan and enrichment generations, reject stale owners, and verify target and related-port release after execution.
- Expand Windows service-host evidence with service names, display names, host groups, executable paths, and ServiceDLL details.
- Replace manual archive target entry with eligible-volume recommendations, selectors, and a directory picker; revalidate absolute non-system targets before execution.
- Add snapshot-based Windows Recycle Bin inspection, volume selection, plan/token execution, post-clean rescan, and persistent result/error panels.
- Correct Dark and High Contrast cleanup card readability and add automated layout, contrast, overflow, localization, and screenshot regression checks.
- Add an About panel sourced from build metadata and translate additional backend cleanup/archive guidance in the English interface.
- Harden acceptance reporting so deferred/manual work is not counted as passed and stale reports cannot contaminate a current release result.

The public stable update channel remains on 1.8.2 until the 1.8.3 installed-app and release gates are complete.

## 1.8.2 Stable

- Restored and hardened the Cleanup, Ports, Environment, Reports, and File Associations workflows affected by the Workbench frontend refactor.
- Added durable page-level results and errors for core actions that previously relied on transient notifications.
- Added feature acceptance, backend/frontend drift, selector, toast-only, data-contract, safety, and repository-hygiene gates.
- Hardened protected-process handling, token-gated execution, owner re-checks, backup evidence, verification, and rollback boundaries.
- Made Windows ANSI output decoding independent of the runner's active system locale, with GBK and Windows-1252 regression coverage.

Known limitations and the evidence-based comparison with v1.7.0 are documented in [docs/release-v1.8.2.md](docs/release-v1.8.2.md). Runtime architecture redesign remains tracked by #130 for v1.9.0.

## 1.8.1

- Published the Workbench stability hotfix. See [docs/release-v1.8.1.md](docs/release-v1.8.1.md).
