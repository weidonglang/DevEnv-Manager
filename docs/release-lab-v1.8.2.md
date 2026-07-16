# v1.8.2 ReleaseLab Evidence Summary

## Scope

This document records the sanitized, reviewable results for the historical installer RCA and current `71cdcd9` release candidate. Raw VM files, registry captures, LevelDB files, screenshots, and credentials remain outside Git under `artifacts/release-lab/`.

VM: `DevEnv-Manager-ReleaseLab-2`

Clean checkpoint: `BASE-00A-Clean-Windows-LocalAdmin`

Current RC: `71cdcd96139791c65308fb9a8a280f56806bf3a1`

## Guest Asset Verification

| Asset | Guest size | Guest SHA256 | Result |
|---|---:|---|---|
| NSIS | 2,700,971 | `6d4d4edb59b115fd4be8b1fbff94c2f67ce7aeadf8dda91425167ba23fedb31a` | matched |
| MSI | 4,550,656 | `d83d83c534566e8489d7c9745cb6809ec52fbca7dc97ea338d5d189c055d6644` | matched |

Guest verification evidence `n1-before-and-launch.json` SHA256: `872117f2753c81d0b192357525df5be2219e03353b911c8cdef40c973f08c2a8`.

## Historical RCA

| Case | Result | Sanitized summary SHA256 |
|---|---|---|
| A | PASS | `f06a2ccd52815d5ffb6bb8ebb15cbfacee67da2357bee8095d3b5ce94ddd9751` |
| B | PASS | `e7bd45b8c81f0ca6826c10ce0178fac4988f45ecdac4eb1cbe0d3e39f123dcd7` |
| C | PASS | `304027c79e744293f5e4ab9874d44fd7489a0f1dce38b126ac149529d53e6c23` |
| D | PASS | `bd44f4d2f9917cd1339cb0504dbeec750012193f7d76df8f047ca2de7d44e191` |
| E | PASS | `ac1b5eb126e28f2aa4082001c2c7e126c7c973995267a72251b618d573c08f7c` |

The original development-host rollback failure was not reproduced. Clean Case D passed the required interactive rollback and clears the installer blocker.

## Current RC Matrix

| Case | Scenario | Result | Sanitized summary SHA256 |
|---|---|---|---|
| N1 | NSIS clean install, launch, settings write, uninstall | PASS with nonblocking temp self-delete observation | `956360a0b92a0b1f6cd04ed3c812be13cebe067549d26b9307d03b296f8e825f` |
| N2 | MSI clean install, launch, settings write, uninstall | PASS | `51b76da8a02508e8189e6f61821ca007a6a77892939202bec84fe49004363031` |
| N3 | v1.7.0 -> current RC upgrade with Profile retention | PASS after fixture-path correction | `26a68ceee067026c063332cc73d7a97a628f3c887533fecfb1ceb30519694cde` |
| N4 | current RC uninstall -> interactive v1.7.0 rollback | PASS | `addf73e9c43220bab0ec457cfd58b3e310330e098ab26c8561c5a1d01067f920` |
| N5 | application-initiated self-uninstall | PASS | `ebf957ef4eb49499a648618dbbd65135b1c704caedfb7e2ad32338c06ab07dd7` |
| N6 | controlled update check/download/integrity/token/launch | PASS | `d36a04aa53c0bcb78823f4bd313f7ae9ab609dfce735bf5fcd0e78a7bef11c0c` |

N5 proved command/action/plan/risk token consistency and official uninstaller launch. N6 proved persistent progress/results, size mismatch rejection, SHA256 mismatch rejection, verified download, a matching high-risk token contract, application exit, and installer launch. Confirmation tokens are redacted in committed summaries.

N6 key evidence hashes:

- Download verification matrix: `2ee2f1562303accb42eb21be4d5606c066e7c6d2b2c68b8ea86d69a8f590462a`
- Sanitized WebView execution trace: `1f6679438443d0bac17602b11ca2c83c4ceee5c068f20e2346532e28454ab485`

Temporary N6 GitHub and Gitee source branches, the host proxy bridge, and its firewall rule were removed after capture. The VM was restored to the clean checkpoint; the localized Heartbeat-name probe was inconclusive, while the restore and VM start commands completed and the VM returned to `Running`.

## Remaining Gate

Historical A-E and current N1-N6 are complete. Fourteen evidence capabilities remain across seven isolated groups: Partition, Environment, File Associations, MySQL, Platforms, Services, and Runtime.

PR #132 must remain Draft. This evidence does not authorize merge, tag, or release.
