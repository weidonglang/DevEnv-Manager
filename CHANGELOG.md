# Changelog

## 1.8.2 Release Candidate

- Restored and hardened the Cleanup, Ports, Environment, Reports, and File Associations workflows affected by the Workbench frontend refactor.
- Added durable page-level results and errors for core actions that previously relied on transient notifications.
- Added feature acceptance, backend/frontend drift, selector, toast-only, data-contract, safety, and repository-hygiene gates.
- Hardened protected-process handling, token-gated execution, owner re-checks, backup evidence, verification, and rollback boundaries.
- Made Windows ANSI output decoding independent of the runner's active system locale, with GBK and Windows-1252 regression coverage.

Known limitations and the evidence-based comparison with v1.7.0 are documented in [docs/release-v1.8.2.md](docs/release-v1.8.2.md). Runtime architecture redesign remains tracked by #130 for v1.9.0.

## 1.8.1

- Published the Workbench stability hotfix. See [docs/release-v1.8.1.md](docs/release-v1.8.1.md).
