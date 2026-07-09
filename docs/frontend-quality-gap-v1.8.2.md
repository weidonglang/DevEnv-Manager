# DevEnv Manager v1.8.2 Frontend Quality Gap

Date: 2026-07-09
Branch: `codex/v1.8.2-function-audit`
Audit commit: `b5d06e4`
Scope: frontend quality and usability gap record. This is audit-only.

## Known Quality Gaps

| Area | Gap | Impact | Priority |
| --- | --- | --- | --- |
| High contrast / dark themes | User screenshots show feature guide/help cards with unreadable low-contrast text. | Users cannot read safety guidance. | P0 |
| Feature guide collapse | User reported Report page guide stayed expanded. | Main content is pushed down and feels noisy. | P1 |
| Browser preview backend errors | Direct browser preview shows backend unavailable. | Users think functions are broken when testing outside Tauri. | P0 documentation/test-path issue |
| Toast-only success | Several handlers still finish with toast/progress text. | User cannot inspect durable result after action. | P1 |
| Button without visible result | Static scan cannot prove every action renders durable output. | Perceived "click does nothing". | P1 |
| Backend-only features | Cleanup backend commands lack UI entry. | Function loss from user's point of view. | P0 |
| Ports closability explanation | Rows may be non-closable without enough visible reason. | "400 ports but none can close" perception. | P0 |
| Full visual regression | No new screenshots captured in this audit. | Cannot claim HC/D fix or layout pass. | P1 |

## Static Scan Notes

| Scan | Result |
| --- | --- |
| Feature files | `dashboard`, `runtimes`, `environment`, `projects`, `ports`, `fileAssociations`, `cleanup`, `profiles`, `reports`, `settings`, `toolchains` all have frontend modules. |
| Action/API scan | Major actions are present, but static presence is not equal to usable UX. |
| Cleanup backend-only scan | Found registered commands with no frontend invocation. |
| `valueOf(...)` scan | Field fallback is still common; business-critical fields must stay behind adapters or typed view models. |

## Pages Needing Manual Visual QA

| Page | Theme | Required check |
| --- | --- | --- |
| Settings | Dark | Guide/help card text contrast. |
| Settings | High contrast | Guide/help card background and text contrast. |
| Reports | Dark / high contrast | Guide collapse state, export controls, result panel. |
| Cleanup | Dark / high contrast | C rescue and cleanup result readability. |
| Ports | Dark / high contrast | Port table dense rows, risk labels, disabled reason text. |
| Runtime | Dark / high contrast | External/managed runtime action visibility. |

## Frontend Regression Guard Gaps

| Guard | Current state | Needed |
| --- | --- | --- |
| Frontend data contract | Existing checks cover known field regressions. | Expand to require view model adapters for core business fields. |
| Action feedback | Partial scripted check exists. | Flag new action handlers that only toast without state/result mutation. |
| Backend-only commands | Missing. | Script should compare registered Tauri commands with frontend invocations and an allowlist. |
| Theme contrast | Missing. | Add Playwright screenshot and contrast sampling for D/HC. |
| Real Tauri smoke | Manual. | Add reproducible checklist and, if possible, window automation. |

## Do Not Mark Complete Until

| Requirement | Evidence |
| --- | --- |
| HC/D cards readable | Screenshots from real app or Playwright-equivalent rendering. |
| Report guide collapse verified | Screenshot or manual result record. |
| Ports disposable close works | Tauri UI smoke with `python` listener. |
| Cleanup old features exposed | UI entries and screenshots for disk overview, duplicate scan, desktop/downloads archive. |
| No backend-only P0 commands | Updated command/frontend diff report. |
