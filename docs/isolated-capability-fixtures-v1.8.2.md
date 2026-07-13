# v1.8.2 Isolated Capability Fixture Evidence

## Scope

The acceptance-only Rust binary and Python runner execute seven capabilities against dedicated temporary files, directories, configuration state, and an unused local port. The normal Tauri build does not include the binary unless the `acceptance-fixtures` Cargo feature is explicitly enabled.

Run from the repository root:

```text
python scripts/run_isolated_capability_fixtures.py
```

The same runner is included in:

```text
python scripts/run_feature_acceptance.py --mode safe
```

## Verified Capabilities

| Capability | Isolated verification |
|---|---|
| `cleanup.archive-plan` | Source hash, plan/token, copy, target hash, source removal, receipt, and copy-back recovery. |
| `cleanup.dev-cache` | Fixed official command contract, selected fixture removal, reclaimed bytes, and outside sentinel hash. |
| `cleanup.download-cache` | Managed test root only, selected child removal, unselected file retention, and outside boundary proof. |
| `cleanup.move-rollback` | Source hash, plan/token, verified target, Junction receipt, rollback token, source restore, target cleanup, and final hash. |
| `profiles.apply` | Isolated profile create/save/export/import, fingerprint-bound token, shared environment writer, reload, restore, and final state hash. |
| `projects.configuration` | Project-local plan/token, backup, write/diff, JSON consumer read, restore, and final hash. |
| `projects.port-config` | Unused local port, plan/token, project-local update, reread, no service start, backup restore, and final hash. |

## Evidence Handling

Raw JSON, workspace files, and SHA256 manifests are written below `artifacts/isolated-evidence/<UTC>/`, which is Git ignored. The runner validates all seven case records and writes a SHA256 manifest. The reviewed run completed with 7 passed, 0 failed; its raw manifest SHA256 was `4738fed6fd5c36e471a9897d83b801c7c347811d7d63939e1dcaefd4ab0e1410`.

No real Downloads folder, user profile configuration, environment registry, service, runtime installation, file association, MySQL instance, partition, installer, or update channel is accessed. Those capabilities remain VM evidence blockers.
