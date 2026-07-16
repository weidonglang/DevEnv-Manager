# DevEnv Manager v1.8.1

v1.8.1 is a public hotfix release focused on making existing users able to update to a safer and more usable Workbench. It is not the final completion pass for every advanced feature; remaining completeness work continues in v1.8.2 / v1.9.0.

## Highlights

- Stabilized Dashboard fallback loading so port scan / netstat timeouts no longer break the whole landing page.
- Fixed Workbench async navigation bounce and reduced empty or result-less feedback states.
- Restored visible result areas for plan/token actions across core pages instead of relying only on toast messages.
- Improved Ports & Services search/filter behavior and made "not scanned yet" a normal state instead of an error.
- Hardened Risk UX progress, timeout, debug visibility, and action result rendering.
- Fixed install-only JDK flows so they do not show bogus backup receipts.
- Kept external runtimes read-only while managed runtimes keep switch/uninstall behind token-gated actions.
- Improved dark mode and high-contrast readability for Runtime and Risk panels.
- Added Debug export support for troubleshooting user-reported regressions.
- Updated Environment, Projects, Reports, Cleanup, Profiles, Settings, and feature guide data mapping to avoid large "unavailable" regressions.

## Installer

- `DevEnv.Manager_1.8.1_x64-setup.exe`

## Size

`2657072`

## SHA256

`0020a53785094797c77e15ff811c62802669db9b657dcd168437e050b9747df0`

## Known Limitations

- Some advanced runtime completeness checks and old-feature parity improvements remain scheduled for v1.8.2 / v1.9.0.
- v1.8.1 prioritizes Workbench usability, data-contract correctness, safe feedback, and release-channel repair over expanding new features.
- Users should still treat environment variable changes, PATH cleanup, service operations, cleanup actions, junction moves, and runtime switching as operations that require review and backups.

## 中文摘要

v1.8.1 是公开热修复版本，目标是先让旧版本用户能够更新到更稳定、可用、可排查的 Workbench。它不是所有高级功能的最终完成版，剩余完整性工作继续进入 v1.8.2 / v1.9.0。

- 修复 Dashboard 因端口扫描 / netstat 超时导致整页异常的问题。
- 修复 Workbench 异步导航回跳，并减少空 toast、无结果反馈等状态。
- 核心页面的计划/令牌操作现在需要有可见结果区，不再只依赖 toast。
- 修复端口搜索/筛选体验，未扫描端口显示为正常的“尚未扫描”状态。
- 加强 Risk UX 的进度、超时、调试信息和操作结果展示。
- 修复仅安装 JDK 时显示伪备份回执的问题。
- 外部运行时保持只读，受管运行时的切换/卸载继续走令牌保护。
- 改善 Runtime 和 Risk 面板在深色/高对比度主题下的可读性。
- 增加 Debug 导出能力，方便排查用户现场回归。
- 修正 Environment、Projects、Reports、Cleanup、Profiles、Settings 和功能指南的数据映射，避免大面积“不可用”。
