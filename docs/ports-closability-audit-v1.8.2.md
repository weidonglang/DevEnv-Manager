# DevEnv Manager v1.8.2 Ports Closability Audit

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: real Windows port evidence plus static frontend/backend wiring. This is audit-only.

## Summary

Current machine sample found 62 listening endpoints. Most endpoints are system, service-owned, licensing, gaming device, database, or local development processes. The product must not show unsafe direct close actions for protected/system/service-owned endpoints, but it must clearly explain why those rows are not directly closable and still allow a safe plan for disposable user processes.

## Static Wiring

| Flow | Frontend entry/API | Backend command | Static status |
| --- | --- | --- | --- |
| Scan ports | Present | `scan_ports` | Wired |
| Port history | Present | `port_history` | Wired |
| Create resolution plan | Present | `create_port_resolution_plan` | Wired |
| Execute resolution plan | Present | `execute_port_resolution_plan` | Wired |
| Inspect local services | Present | `inspect_local_services` | Wired |
| Stop local service | Present | `stop_local_service` | Wired |
| Open process location | Present | `open_process_location` | Wired |

## Real Windows Sample

Command: `Get-NetTCPConnection -State Listen`

Total listening endpoints observed: 62.

Representative rows:

| Address | Port | PID | Process | Service | Audit classification |
| --- | ---: | ---: | --- | --- | --- |
| `::` / `0.0.0.0` | 135 | 2664 | `svchost` | `RpcEptMapper,RpcSs` | Protected service |
| `192.168.8.222` | 139 | 4 | `System` |  | Protected system |
| `::` | 445 | 4 | `System` |  | Protected system |
| `127.0.0.1` | 1420 | 38432 | `node` |  | User/dev process candidate |
| `::` | 3306 | 11684 | `mysqld` |  | Database process; require caution |
| `::` / `0.0.0.0` | 5043 | 11760 | `postgres` |  | Database process; require caution |
| `127.0.0.1` | 1084 | 9152 | `tomcat10` | `ANSYSLicensingTomcat` | Service-owned |
| `127.0.0.1` | 43595 | 9152 | `tomcat10` | `ANSYSLicensingTomcat` | Service-owned |
| `0.0.0.0` | 7680 | 8628 | `svchost` | `DoSvc` | Protected service |
| `0.0.0.0` | 9012 | 15072 | `ArmourySocketServer` |  | Vendor app |
| `127.0.0.1` | 13010 | 9136 | `ArmouryCrate.Service` | `ArmouryCrateService` | Service-owned |
| `127.0.0.1` | 33211 | 9180 | `clash-verge-service` | `clash_verge_service` | Service-owned |
| `127.0.0.1` | 49583 | 14744 | `steam` |  | User app; caution |
| `::` / `0.0.0.0` | 49664 | 2352 | `lsass` | `KeyIso,SamSs,VaultSvc` | Protected service |
| `::` / `0.0.0.0` | 49668 | 8716 | `spoolsv` | `Spooler` | Protected service |

## Disposable Port Proof

Temporary audit process:

```text
python listener on 127.0.0.1:18765
StartedPid: 1644
Detected by OS: true
Detected process: python
Path: C:\Users\David\AppData\Local\Programs\Python\Python313\python.exe
Cleanup: process stopped, temp script deleted
```

Interpretation: a normal user-owned local listener can be detected by the OS and should be eligible for the Ports plan/execute flow unless the app's safety classifier intentionally blocks it.

## Why A User Can See Many Ports But No Direct Close Action

| Cause | Expected behavior | UX requirement |
| --- | --- | --- |
| PID 4 / `System` | Never direct kill | Explain "system protected". |
| `svchost`, `lsass`, `spoolsv`, Windows services | Do not process-kill | Offer service flow only where safe, otherwise explain. |
| Service-owned app process such as Tomcat licensing | Do not ordinary-kill | Show service name and service-stop path if supported. |
| Database process such as MySQL/Postgres | Require caution/token | Show risk reason and plan details. |
| User/dev process such as `node`/`python` | Can be close candidate | Show create-plan action and result panel. |
| Vendor utility process | Usually caution | Explain app/process identity and risk. |

## Audit Findings

| Finding | Severity | Evidence | Required next step |
| --- | --- | --- | --- |
| Static Ports flow is wired. | Info | Frontend invokes scan/history/plan/execute/service commands. | Keep. |
| Real machine can contain mostly non-disposable ports. | P1 | Sample includes System, svchost, licensing services, vendor services. | Row-level reason labels are required. |
| Disposable process exists and is detectable. | P0 | Temporary `python` port 18765 was detected. | Real Tauri UI must prove plan/execute on this row. |
| User's "400 ports, none closable" report is still plausible. | P0 | Large endpoint count can be service-heavy, or UI may hide eligible rows. | Add manual smoke and collect app debug log. |
| Service-owned port should not use ordinary close. | P0 | Tomcat licensing service sample. | Keep service flow separate from process kill. |

## Manual Tauri Test Path

1. Start a disposable listener:

```powershell
python -m http.server 18765 --bind 127.0.0.1
```

2. Open the real Tauri app.
3. Open `端口与服务`.
4. Scan ports.
5. Search `18765`.
6. Select the row.
7. Create a port resolution plan.
8. Execute the plan with confirmation.
9. Verify the process stopped or a visible, specific refusal reason is rendered.
10. Repeat scan and verify the port is gone.

## Pass Criteria

| Scenario | Expected |
| --- | --- |
| Disposable `python` port | Plan button visible, plan renders, execute renders receipt, port disappears. |
| PID 4/System port | No unsafe close button; protected reason visible. |
| Service-owned Tomcat/licensing port | Direct close disabled; service name shown; service path if available. |
| Database port | Requires caution and token; no silent close. |
| No selected port | Inline guidance, not only a transient toast. |
