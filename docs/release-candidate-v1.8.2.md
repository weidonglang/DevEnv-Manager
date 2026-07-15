# v1.8.2 Updated Release Candidate

## Build Identity

- Built from: `71cdcd96139791c65308fb9a8a280f56806bf3a1`
- Short commit: `71cdcd9`
- Product version: `1.8.2`
- Target: `x86_64-pc-windows-msvc`
- Created: `2026-07-13T06:14:38Z`
- Reason for rebuild: probe actual managed-directory creation permission so `C:\DevEnvManager` is selected when `D:` is read-only media.
- Raw assets and logs: Git-ignored `artifacts/release-candidate/71cdcd9/`

## Assets

| Bundle | File | Size | SHA256 | Signature |
|---|---|---:|---|---|
| NSIS | `DevEnv Manager_1.8.2_x64-setup.exe` | 2,700,971 | `6d4d4edb59b115fd4be8b1fbff94c2f67ce7aeadf8dda91425167ba23fedb31a` | NotSigned |
| MSI | `DevEnv Manager_1.8.2_x64_en-US.msi` | 4,550,656 | `d83d83c534566e8489d7c9745cb6809ec52fbca7dc97ea338d5d189c055d6644` | NotSigned |

The earlier `c884495` and `d90f4b3` candidates are superseded. Historical v1.8.2 assets with hashes `858e128...` and `ca9f6f0...` remain RCA-only and must not be published.

## ReleaseLab Status

- Guest-side NSIS and MSI sizes and SHA256 values: matched.
- Historical installer Cases A-E on independent clean restores: passed.
- New RC Cases N1-N6: passed. N1 retains one nonblocking NSIS temporary self-delete observation; no installed product file or user setting was affected.
- Interactive v1.7.0 rollback failure from the original host: not reproduced in clean ReleaseLab Cases D or E; installer blocker cleared.
- `system.self-uninstall`: evidence complete.
- `update.download-install`: evidence complete, including size and SHA256 rejection tests and token-gated installer launch.
- Remaining VM evidence blockers: 14 capabilities across Partition, Environment, File Associations, MySQL, Platforms, Services, and Runtime.
- PR #132 remains Draft. No merge, tag, or release is authorized by this document.

The binary files must remain Git ignored until all remaining evidence blockers are resolved and an independent release review returns GO.
