# DevEnv Manager v1.8.1

v1.8.1 is a hotfix release for Dashboard resilience, app language selection, and release metadata consistency.

## Highlights

- Fixed Dashboard fallback loading so port scan / netstat timeout cannot break the whole landing page.
- Dashboard no longer runs a full `scan_ports` call during default load; Ports & Services remains the explicit scan entry.
- Added app-level i18n with Auto / zh-CN / en-US language options.
- Added Settings language selection and Command Palette language switching commands.
- Added i18n coverage for Shell, Dashboard, main feature titles and actions, loading/error states, and Risk UX.
- Restored first-launch safety notice before the workbench can be entered.
- Restored per-page usage/risk guidance and visible risk level definitions.
- Updated release metadata for GitHub + Gitee v1.8.1.

## Installer

- `DevEnv.Manager_1.8.1_x64-setup.exe`

## Size

`2626160`

## SHA256

`366eea864333bc1927da182d8409462b53676da8b4a8432c24a5aa2d2def8de6`

## 中文摘要

v1.8.1 是热修复版本：

- 修复端口扫描 / netstat 超时时 Dashboard 整页加载失败的问题。
- Dashboard 默认不再执行完整端口扫描；需要扫描时进入“端口与服务”页面。
- 新增应用级语言选项：跟随系统 / 简体中文 / English。
- Settings 支持切换语言，Command Palette 支持语言切换命令。
- Shell、Dashboard、主要功能标题和按钮、加载/错误状态、Risk UX 支持中英文。
- 恢复进入工作台前的首次启动安全声明。
- 恢复每页功能/风险说明和风险等级定义。
- 补齐 GitHub + Gitee v1.8.1 发布元数据一致性。
