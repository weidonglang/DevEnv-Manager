# v1.8.2 Updated Release Candidate

## Build Identity

- Built from: `c884495cc4f3ffa50c01df04d5b727bb815de8a2`
- Git status at build: clean
- Build window: `2026-07-13T01:45:08.3156695Z` to `2026-07-13T01:47:23.4617962Z`
- Product version: `1.8.2`
- Target: `x86_64-pc-windows-msvc`
- Command: `npx tauri build --bundles msi nsis --ci`
- Raw log: Git-ignored `artifacts/release-candidate/c884495/tauri-build.log`

## Assets

| Bundle | File | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv Manager_1.8.2_x64-setup.exe` | 2,700,872 | `959d9022df44ee58bfffbe5f6154904f52bab1706feac663820efed9fba01dec` | NotSigned |
| MSI | `DevEnv Manager_1.8.2_x64_en-US.msi` | 4,546,560 | `4b9f54a9e4e681fb3b15ac9dd92c8b9acd20dbcdce01ab9933de2e3337b40a71` | NotSigned |

The binary files remain under the Git-ignored `artifacts/release-candidate/c884495/` directory and must not be committed or published before VM validation and independent release review.

## Separation From Historical Assets

These hashes differ from the historical v1.8.2 RCA assets:

- Historical NSIS: `858e128f42b774e41772da9c065596c116812355d90c7943636bfaedded321e7`
- Historical MSI: `ca9f6f0346b68ec4901e18f2d2f499ba0aa053e2f23e6a4503d155d79ca95ac3`

The historical files remain RCA-only and are not release candidates.

## Pending ReleaseLab Gates

- Guest-side SHA256 comparison: pending.
- Historical installer Case A-E RCA: pending user-operated VMConnect evidence.
- New RC install, upgrade, rollback, update and self-uninstall validation: pending.
- Remaining 16 VM evidence blockers: pending.
- Installer blocker: remains open until the ReleaseLab evidence is reviewed.
