# DevEnv Manager

[GitHub 主仓库](https://github.com/weidonglang/DevEnv-Manager) · [Gitee 国内镜像](https://gitee.com/weidonglang/DevEnv-Manager) · [GitHub Release](https://github.com/weidonglang/DevEnv-Manager/releases) · [Gitee Release](https://gitee.com/weidonglang/DevEnv-Manager/releases) · [完整操作手册](docs/user-guide.md) · [安全说明](docs/safety-and-disclaimer.md) · [问题反馈](https://github.com/weidonglang/DevEnv-Manager/issues)

面向 Windows 的开发环境诊断器与安全操作面板。当前版本：**1.9.1 Stable**。

1.9.1 修复 Runtime 切换看似无响应的问题，并让经过强验证的外部 JDK、Python、Node.js、Go、Maven 和 Gradle 可以在不修改外部目录的前提下安全采用到用户环境。切换计划、差异、备份、验证、失败恢复和重启后的恢复入口现在都可见且可追踪。

## 下载与镜像

- GitHub 主仓库：https://github.com/weidonglang/DevEnv-Manager
- Gitee 国内镜像：https://gitee.com/weidonglang/DevEnv-Manager
- GitHub Release：https://github.com/weidonglang/DevEnv-Manager/releases
- Gitee Release：https://gitee.com/weidonglang/DevEnv-Manager/releases
- v1.9.1 NSIS：https://github.com/weidonglang/DevEnv-Manager/releases/download/v1.9.1/DevEnv.Manager_1.9.1_x64-setup.exe
- 国内下载：https://gitee.com/weidonglang/DevEnv-Manager/releases/download/v1.9.1/DevEnv.Manager_1.9.1_x64-setup.exe
- NSIS SHA256：`ce4b9020d47258dd1668f0237a0b3fd0b061ddfc20c938fed56f5ddcf5cd0352`

适合：

- Java / Spring Boot 学习者
- Python 初学者和多版本用户
- 前端开发者
- 经常被 PATH、JAVA_HOME、pip、npm、端口占用折磨的人
- 想把 JDK、Python、Node.js、Maven、Gradle 安装到固定目录并快速切换的人

一句话：Windows 开发环境乱了？先看清实际生效的版本、PATH、JAVA_HOME 和工具来源，再决定是否执行受管修复。

## 项目定位

DevEnv Manager 解决的是 Windows 上多个开发生态互相影响的问题：运行时版本不透明、`JAVA_HOME` 与 PATH 不一致、端口冲突、包管理器来源混杂、项目要求与本机环境不匹配，以及安全操作缺少预览和恢复入口。

它不是新的包管理器、构建工具或“系统管家”。项目优先做三件事：

1. **诊断**：展示可验证的路径、版本、来源和冲突证据。
2. **编排**：调用成熟工具或 DevEnv Manager 自己的受管运行时。
3. **保护**：用户级修改、固定 action id、白名单、备份、校验、只读预览和明确确认。

### 不会替代什么

本项目不会替代 uv、pip、npm、pnpm、Yarn、Vite、Maven、Gradle、Docker、WSL、Scoop、Chocolatey、mise、asdf、sdkman、pyenv、nvm、rustup 或 `dotnet` CLI。能由成熟工具完成的工作，DevEnv Manager 优先检测、解释、辅助配置或调用对应工具。

### 适合谁 / 不适合谁

- 适合不确定当前真正生效版本、需要同时维护多套 JDK/Python/Node，或经常遇到 Windows PATH 与端口问题的用户。
- 适合希望用图形界面查看诊断证据，同时保留 CLI 自动化入口的用户。
- 不适合希望软件自动接管整台机器、清理任意个人文件或替代专业包管理器的场景。
- 熟练使用 mise/asdf/Scoop/Chocolatey 且环境已经稳定的用户，可以只使用诊断能力。

## 1.9.1 Stable

我们向在 v1.9.0 中点击“设为当前”却看不到可靠反馈、无法判断操作是否开始，以及不得不手工修改环境变量来采用外部 Runtime 的用户郑重道歉。一个涉及 PATH、`JAVA_HOME` 和项目 SDK 的操作不应该让用户猜测，也不应该依赖用户反复截图和重装才能暴露状态丢失。v1.9.1 将这条工作流重新收束为可见、可验证、可恢复的完整闭环。

本次版本完成：

- 受管 Runtime 的“设为当前”会持续显示准备、计划已创建、执行、验证、成功或失败状态；计划自动聚焦，错误和结果不会只停留在短暂 toast。
- 前端不再把 `kind/version/path` 当作可信目标。后端只接收稳定 Runtime ID 和白名单切换模式，并重新解析发现来源、强验证结果、可执行文件与 provider 身份。
- 强验证通过的外部 JDK、Python、Node.js、Go、Maven 和 Gradle 可以采用到当前用户环境；DevEnv Manager 不写入、不移动、不删除这些外部目录，也不提供直接卸载。
- nvm、fnm、Volta、Scoop 和 rustup 使用各自 provider 语义；非 rustup Rust 保持只读；.NET SDK 使用项目级 `global.json`，不会伪装成全局 SDK 切换。
- 每次切换都保存精确计划、环境差异、来源权威、状态指纹、备份路径、有效期和单次确认令牌。计划过期、目标变化、文件/provider 指纹变化、篡改或重复执行都会被拒绝。
- 执行后使用新子进程验证真实版本、命令路径和必要组件；失败时执行受约束回滚，并把备份、验证证据、下一步和恢复入口保留在页面。
- Runtime 备份列表跨应用重启持久化。修复了后端已经保存备份、但页面首次加载漏掉第四个返回值而不显示恢复选项的问题。
- 保留 v1.9.0 的九类 Runtime 分组、强验证、安装不自动切换、Profile 历史恢复，以及 v1.8.3 的端口、归档、回收站、主题可读性和高风险计划保护。

冻结产品源码提交 `4137fbe` 通过 230 项 Rust 测试、Clippy、113 模块前端生产构建、268 个前端 selector、30 项视觉验收和全部契约检查。聚合功能验收为 300 项：254 通过、0 失败、40 项危险动作按安全策略跳过、6 项人工或策略记录；P0/P1 失败、backend-only、ui-only、missing、partial 和 toast-only 均为 0。

最终 Windows ReleaseLab 验证受管 Node 切换与恢复、外部 Node 采用与恢复、外部目录哈希不变、应用重启后备份列表恢复、NSIS/MSI 安装启动卸载，以及 v1.9.0 升级后设置和 Profile 哈希不变。正式资产、SHA256、验收边界和非阻塞限制记录在 [docs/release-v1.9.1.md](docs/release-v1.9.1.md)。安装器暂未进行 Authenticode 签名，Windows 可能显示常规信任提示。

## 1.9.0 Stable

我们再次向受到此前版本 Runtime 状态混淆、安装与切换边界不清、Windows Store Alias 被误列为外部 Python，以及英文界面仍出现中文 Profile 结果影响的用户郑重道歉。用户不应该通过反复截图、重装和手工验证，替项目发现这些问题。v1.9.0 不只是增加页面选项，而是把运行时识别、安装、切换、验证和恢复重新收束到可审计的产品契约。

本次版本完成：

- Runtime 页面统一展示 JDK、Node.js、Python、Go、Maven、Gradle、Rust/Cargo/rustup、.NET 和其他工具九类生态，并按“当前生效、DevEnv Manager 受管、外部安装”分组。
- 外部 Runtime 保持只读，只提供打开位置、复制路径和系统级管理入口；不会显示 DevEnv Manager 的直接切换或卸载操作。
- JDK、Node、Python、Go、Maven 和 Gradle 安装区独立分组。安装完成后验证版本命令和必需组件，不完整目标进入重试或隔离流程，不会注册为可用 Runtime。
- 安装 Runtime 不再自动修改当前环境。Maven 和 Gradle 支持明确选择版本；Rust、.NET 和其他工具在 1.9.0 中保持只读发现，不冒充完整安装管理。
- Runtime 切换使用后端保存的精确计划，包含目标身份、PATH 差异、备份、状态指纹、风险和确认令牌；计划过期、状态变化、内容篡改或重复消费都会被拒绝。
- 切换执行后重新验证实际命令和关键组件；失败时保留备份与回滚信息。Runtime 强验证报告可以从报告页导出。
- Profile 历史记录持久化保存完整快照，默认保留最近 100 条；保存、删除、重命名、复制、导入、应用和恢复前都会留下可追踪快照。
- Profile 历史恢复同样使用后端计划、指纹、备份和单次确认令牌，拒绝过期或已变化的目标状态。
- Profile 操作摘要在中文和英文界面完整本地化；WindowsApps Store Alias 不再被当成可管理的 Python Runtime。
- v1.8.3 的端口分组、归档选择与恢复、回收站复扫、暗色/高对比可读性，以及 Move、扩容、文件关联和 Junction 安全计划继续保留。

冻结源码提交 `6e65e8d` 通过 216 项 Rust 测试、Clippy、113 模块前端构建、245 个前端 selector、30 项视觉验收和全部契约检查。功能验收报告为 246 通过、0 失败、40 项危险动作安全跳过、6 项人工或策略验收；P0/P1 失败、backend-only、ui-only、missing 和 partial 均为 0。最终 Windows ReleaseLab 从精确提交构建的 NSIS 安装，验证九类 Runtime 分组、Store Alias 过滤、中文/英文 Profile 历史恢复、Dark/High Contrast 可读性和卸载清理，结果全部通过。

正式资产、SHA256、验收边界和非阻塞限制记录在 [docs/release-v1.9.0.md](docs/release-v1.9.0.md)。安装器暂未进行 Authenticode 签名，Windows 可能显示常规信任提示。

## 1.8.3 Stable

我们向所有在 v1.8.2 中遇到端口扫描超时、IPv4/IPv6 重复行、深色或高对比模式文字看不清、归档目标必须手写、归档后无法恢复或清理回收站，以及中英文混杂问题的用户郑重道歉。这些缺陷本应在发布前由自动化与真实 Windows 验收发现，而不应让用户反复截图和手测。

v1.8.3 集中完成了以下修复和加固：

- 端口扫描改为有界快速快照和异步增强，加入单航班、缓存、最近成功结果、强制刷新、取消与来源诊断；高连接压力下不再因 `netstat` 拖住页面。
- IPv4、IPv6 和重复来源记录合并为稳定的一行，同时保留所有绑定、服务、进程路径、命令行、父进程、发布者和置信度证据。
- `ESTABLISHED` 等非监听连接保持只读；系统进程、受保护进程和服务拥有目标继续禁止普通强制结束。
- 桌面与下载目录归档会自动推荐可用的非系统盘，也可打开目录选择器，不再要求手写盘符或路径。
- 归档预览固定列出每个源文件、目标文件、大小和 SHA256；跨盘执行采用“复制、校验哈希、删除源文件”，并为桌面和 Downloads 都提供持久的恢复入口。
- 回收站增加独立快照、卷选择、计划、确认令牌、执行结果和最终复扫；只有权威复扫证明目标已消失时才判定成功。
- Move、C 盘扩容和文件关联计划改为后端保存的精确计划，加入过期时间、容量上限、篡改拒绝和单次消费；扩容执行前重新读取分区布局。
- Junction 在无法保存回滚记录时会立即失败并恢复原目录，不再留下无法追踪的连接。
- 清理页在 Light、Dark、System 和 High Contrast 下统一使用主题令牌，修复白底白字、低对比和内容溢出。
- 补齐清理、归档、环境和验证结果的中英文适配，并让视觉测试超时可控，避免 CI 被 Edge 探针无限挂起。

冻结提交通过 211 项 Rust 测试、Clippy、113 模块前端生产构建、165 个 P0/P1 selector、全部前后端契约检查和 GitHub CI。最终 Windows ReleaseLab 从精确 HEAD 安装 NSIS，15 项关键功能断言全部通过：端口压力扫描约 59 ms，桌面和 Downloads 归档后按原 SHA256 恢复，回收站执行后复扫为空，D/HC 截图可读；清理后无应用注册、测试进程、计划任务或测试磁盘残留。

正式资产、SHA256、验收边界和发布顺序记录在 [docs/release-v1.8.3.md](docs/release-v1.8.3.md)。v1.9.0 Runtime 重构和 Profile 历史模型仍在后续 issue 中跟踪，不会被本次热修复误报为完成。

## 1.8.2 Stable

我们需要向受 v1.8.0 和 v1.8.1 回归问题影响的用户郑重道歉。Workbench 重构后曾出现页面大面积“不可用”、按钮只有短暂提示却没有结果、旧功能入口丢失、深色和高对比度模式难以阅读、端口扫描超时拖累其他页面，以及计划创建后找不到执行入口等问题。这些问题不应由用户反复手测才能发现。

v1.8.2 因此不是继续堆叠新功能，而是一次完整的稳定性恢复和旧功能迁移：

- 以 v1.7.0 为黄金基线盘点 237 条入口和承诺，归一为 87 项用户能力；当前 74 项等价、13 项增强，缺失和降级均为 0。
- 恢复 Cleanup 的磁盘概览、重复大文件、桌面/下载归档、通用归档、计划执行、回执、回滚、空间搬家和 C 盘扩容闭环。
- 修复 C 盘扩容把 DiskPart 退出码误当成成功的问题；现在必须读取到扩容前后真实容量增长才算成功，并修复 `0 B` 和命令输出乱码。
- 恢复 Ports 表格、进程身份、风险与可关闭原因；系统进程、受保护进程、服务拥有进程和无法确认路径的目标不能进入普通强制结束流程。
- 恢复 Environment 的 JAVA_HOME/PATH/effective tools 证据、Java 稳定化计划、Python 修复、环境备份与回滚；JDK 8 的 `jar` 验证不再误判。
- 恢复 Projects 的真实根目录、项目类型、检测文件、推荐运行时、IDEA 分析、Java consumer 验证和项目端口配置结果区。
- 恢复 Reports 的 Doctor、Markdown/JSON 导出、打开位置、复制摘要和持久计划/结果；不再只依赖 toast。
- 恢复 File Associations 的扩展名搜索、应用选择、计划预览、UserChoice 说明、备份和回滚。
- 明确 Runtime 的受管/外部边界：外部运行时只读，不允许由 DevEnv Manager 直接切换或删除；受管操作继续走计划、确认令牌和验证。
- 完成 Toolchains、Windows 服务、WSL 平台和 MySQL 修复的隔离 VM/UAC 验收；MySQL fixture 的系统表恢复后，`ibdata1` 与业务数据哈希保持不变。
- 完成中英文公共结果字段、Cleanup/Runtime/Settings 进度文案和扩容动态状态适配；新增 648 个双语 key 的一致性门禁，覆盖 29 个 UI 与事件源文件。
- 修复英文界面仍混入后端中文诊断、计划影响、清理原因和运行时验证说明的问题；所有后端可见文本统一经过语言适配边界。
- 修复 Cleanup 摘要与数据库服务表格在 Dark/High Contrast 下的浅色背景和低对比度文字，主题样式统一使用设计令牌。
- 抑制外部 JDK/工具探测失败时弹出的系统级 VCRUNTIME 错误窗口；探测失败现在只进入结构化结果，不阻断工作台。
- 建立 static、safe、frontend、sandbox、manual 五层自动验收，检查 backend-only、ui-only、toast-only、字段漂移、selector、风险契约和空白提示。

最终聚合验收为 283 项：240 通过、0 失败、36 项按安全策略跳过、7 项保留为有明确理由的人工或延期项。Rust 154 项测试、Clippy、110 模块前端生产构建、195 个稳定 selector、170 个后端命令裁决和 GitHub/Gitee 更新元数据一致性均已通过。

v1.9.0 的 Runtime 数据模型重构继续由 #130 跟踪；Profile 历史版本恢复需要新的持久化模型，Advanced 模式仍属于后续策略和视觉工作。这些后续增强不属于 v1.7.0 旧功能缺失。

正式安装包元数据、升级/回滚证据和验收边界记录在 [docs/release-v1.8.2.md](docs/release-v1.8.2.md)。历史 RC 安装包全部作废，不得用于分发。

## 1.8.1 Stable

v1.8.1 is a public hotfix release for:

- Workbench stability after frontend data-contract regressions.
- Dashboard fallback loading when port scan / netstat times out.
- Async navigation, port search, plan/token feedback, and Risk UX progress/result rendering.
- Runtime managed/external boundaries and safer install-only JDK feedback.
- Dark/high-contrast readability and Debug export for troubleshooting.
- GitHub + Gitee release metadata consistency.

Installer: `DevEnv.Manager_1.8.1_x64-setup.exe`

SHA256: `0020a53785094797c77e15ff811c62802669db9b657dcd168437e050b9747df0`

## 1.8.0 Stable

v1.8.0 includes the #116, #117, and #118 stabilization work:

- Runtime/JDK/Python/port reliability hardening.
- Profile and Doctor repair operations use plan -> token -> execute.
- File association safety gates and app search.
- Fluent workbench frontend with real IA routes.
- Command Palette.
- Unified Risk UX with preview, backup/receipt, token progress, result, and recovery guidance.
- Light/Dark/System/High Contrast themes.
- Stronger CI command contracts and frontend architecture checks.

Installer: `DevEnv.Manager_1.8.0_x64-setup.exe`

SHA256: `e827d5bcaaf4ea7d250d687011629253420e1ec9f92930c0af571d7998e6a51a`

## 1.7.0 Stable

1.7.0 完成两个功能闭环：

- 文件打开方式管理器：扫描常见扩展名、展示默认应用与 ProgID、生成修改计划、执行前备份、回滚、UserChoice 保护项跳转系统设置、高风险类型默认只读。
- 国内多源更新：manifest schema v2、Gitee/GitHub 更新源 fallback、下载 mirrors fallback、SHA256 校验、Gitee Release 自动化脚本和国内下载说明。

## 1.6.1 Stable

1.6.1 是 v1.6 通过实机验收后的收口发布：补强前端帮助模块拆分，确认 QA Gate 相关 issue 已覆盖，并同步更新 Release、manifest 与 README。

## 1.6 Stable

1.6 是 v1.5.x QA 收口后的正式稳定版，重点不是扩展“系统管家”能力，而是把已经验证过的开发环境诊断、安全确认、页面说明和发布链路打通到可公开下载状态。

- 高风险操作保护：环境修复/恢复、PATH 清理、项目配置、项目端口、服务管理、Docker/WSL 系统动作、空间搬家/回滚/扩容、缓存清理、进程结束和 MySQL 修复执行均绑定后端 confirmation token。
- 页面说明：每个页面只保留一个详细“页面使用指南”，合并原功能说明卡里的能做/不会做、确认级别、备份要求和失败处理建议，避免上下重复。
- 桌面/下载急救：只读分析结果拆成摘要、分类占用分页和 Top 文件分页，文件卡显示文件名、完整路径、所在目录、大小、修改时间、类型、来源和定位状态。
- 提示体验：右下角进行中提示会保持到操作返回结果；成功/完成提示在结果出现后约 5 秒自动消失，错误提示保持可关闭。
- 系统级入口：Docker、WSL、本地服务和自卸载入口默认折叠在高级区，系统关键进程不提供结束入口。
- 发布链路：更新清单、Release asset、SHA256 和 README 同步到 1.6 Stable。

兼容说明：Tauri identifier 继续保留 `com.weidonglang.dailytools`，Rust/npm 包名继续保留 `dailytools-tauri`，用于兼容旧安装、升级路径和本地配置目录；产品展示名和 Release asset 统一使用 DevEnv Manager。

## 1.5.3 Stable

1.5.3 是质量补丁与稳定版收口，重点不是扩展系统管家能力，而是补齐已反馈问题的安全边界、误判抑制、恢复入口和发布链路。

- 端口管理：新工作台布局、搜索筛选、详情证据、LISTENING/ESTABLISHED 区分，并抑制 Steam、QQ、Chrome、VS Code 和 unknown 端口误判。
- 外部运行时安全：外部 Go/JDK/Python、Scoop/Chocolatey/mise/asdf 等路径不由 DevEnv Manager 删除或接管，只提供查看、复制、打开目录和系统卸载入口。
- MySQL 修复中心：结构化诊断结论、误报抑制、backup manifest 展示和高危修复前校验，避免把权限不足、多实例或可用实例误判为可自动修复。
- Python/chsrc：补齐 Store Alias、PATH、`python -m pip`、`py -0p` 诊断和恢复入口；chsrc 缺失时提供安装指引与单项镜像 fallback。
- 页面帮助与扫描体验：主要页面帮助支持默认折叠；大文件/重复文件扫描支持进度、取消、quick hash/full hash，并尽量打开到具体文件位置。
- 隐私脱敏：报告、JSON、端口 commandLine、Python 诊断等统一脱敏 token、password、Bearer 和 Windows 用户目录。

兼容说明：Tauri identifier 继续保留 `com.weidonglang.dailytools`，Rust/npm 包名继续保留 `dailytools-tauri`，用于兼容旧安装、升级路径和本地配置目录；产品展示名和 Release asset 统一使用 DevEnv Manager。

## 1.5.2 Patch Release

1.5.2 是后台安全与发布状态收口版，集中修复更新清单兼容、高危操作后端确认、部分端口 process-first 识别、MySQL 备份 manifest、rootDir 与受管目录保护、仓库卫生、CI 和 Tauri CSP。

端口管理界面重做、完整端口识别库、首次启动安全声明、Python/chsrc 恢复闭环、外部运行时安全和扫描体验增强未在 1.5.2 完整落地，计划集中进入 1.5.3 Quality Patch。

## 1.5.1 Final Stable

1.5.1 是软著前稳定版，目标是停止扩展系统管家类新方向，集中强化现有 Windows 开发环境诊断、运行时安装完整性、项目启动向导、环境变量可靠性、报告与安全说明。

软著材料建议软件名称为“DevEnv Manager 开发环境诊断与安全配置管理软件”，软著申请版本号建议写为 **V1.0**；GitHub Release 版本号 **1.5.1** 与软著材料 **V1.0** 对应同一稳定交付版本。

仓库包含两个实现：

- `tauri/`：最新 Tauri 2 + Rust + TypeScript 重构版，后续主线维护。
- 根目录 Python/CustomTkinter 版本：旧版实现，保留用于对照和迁移。

## Tauri/Rust 重构版能力

- Temurin、Zulu、Liberica、Microsoft OpenJDK，以及 Python、Node.js、Maven、Gradle 的下载、安装、切换、卸载和 `current` 指针管理。
- 安装根目录智能规范化：选择 `D:\` 时自动使用 `D:\DevEnvManager`，避免把文件散在盘符根目录。
- 安装和切换后自动健康检查，验证命令和环境变量是否真的生效；JDK 会交叉核对 `JAVA_HOME`、PATH、`java`、`javac`、Maven 与 Gradle。
- 运行时强验证：JDK/Python/Node/Maven/Gradle/Go 统一展示未安装、目录存在但未登记、已登记但不可用、组件缺失、环境未生效、可用和当前生效等状态。
- Python 完整性检查：安装后验证 `pip`、`venv`、`ssl`、`sqlite3`、`ctypes`，并将 `tkinter` 作为可选 GUI 组件提示；核心组件失败不会登记为已安装。
- 下载安装过程展示进度：查询、下载、解压、静默安装、验证。
- 用户级环境变量管理：写入前展示 `DEVENV_HOME`、`JAVA_HOME`、PATH 差异；二次确认、回读验证、最多 20 份历史备份和指定恢复。
- `JAVA_HOME` 写入真实绝对 JDK 路径，PATH 仍保留可迁移的 `%DEVENV_HOME%` 受管条目，避免 Nacos、Maven、Gradle 等程序不做二次展开时误报。
- 环境可靠性中心：同时展示当前进程环境和 Windows 用户环境，显示 `JAVA_HOME` raw/expanded、PATH 命中顺序、重复/失效/受管条目、Java/Python/Node/Maven/Gradle 生效来源。
- Java 稳定修复计划：后端生成一次性计划，写入真实绝对 `JAVA_HOME`，保留未知用户 PATH，去重并清理旧 DevEnv Manager 受管条目；执行前校验环境指纹，执行后重新验证。
- 环境备份恢复中心：列出环境备份、恢复前再次备份当前状态、恢复后广播环境变化并重新验证 Java/Python/Node。
- Python 修复闭环：安装前检查当前 `python` / `pip` / `py`、用户 PATH、Store 别名与多版本冲突；修复前展示一次性计划并保存环境备份。
- pip 缺失修复计划：仅对 DevEnv Manager 受管 Python 生成 `ensurepip` 与 pip 升级计划；非受管 Python 只提示，不替用户改系统安装。
- 环境医生：按类别对齐展示诊断项和修复建议，可导出 Markdown/JSON 或复制脱敏报告。
- Python 冲突分析：检测默认 `python`、`pip`、`py -0p`、注册表、Microsoft Store 执行别名风险。
- 配置模板：保存当前 JDK/Python/Node/Maven/Gradle 组合和用户环境变量，导入前预览差异，并可自动补齐缺失版本后恢复。
- 项目启动向导：支持选择项目文件夹，自动规范化路径、检查目录、识别 Node/Python/Maven/Gradle/Rust/Tauri/.NET/Go 项目；生成可编辑的 VS Code/IDEA 配置预览，应用前备份文件和环境模板。
- IDEA / IntelliJ 只读分析：读取 `.idea/misc.xml`、`.idea/modules.xml`、`.idea/compiler.xml` 和 `*.iml`，输出 Project SDK、language level、模块 SDK、编译目标与当前 `JAVA_HOME` 的匹配建议；不自动修改 IDEA 配置。
- Java 消费者环境验证：Nacos、Nexus、Maven、Gradle、Spring Boot 或普通 bat/cmd 脚本可验证最新用户环境中的 `JAVA_HOME`、`java.exe`、`javac.exe`、PATH 首个 Java 和间接引用风险。
- Git / GitHub 工具链：检测 Git、Git Bash、Git LFS、OpenSSH、用户身份、SSH 公钥和 GitHub HTTPS/SSH 连接，可安全配置身份或生成 ed25519 Key。
- Node.js 生态：检测 npm、npx、pnpm、Yarn、Corepack、registry、全局目录和 pnpm store，支持安装包管理器及切换官方源/npmmirror。
- Python 生态：检测 pip、uv、Poetry、virtualenv 和 pip 配置，支持安装工具及切换官方/国内 PyPI 镜像。
- 统一工具注册表：为 JDK、Python、Node.js、Maven、Gradle、Git、Go、Rust、.NET 和生态工具提供统一能力元数据。
- Go 管理：从 `go.dev` 官方索引解析稳定版，校验 SHA256 后安装、切换和卸载 Windows x64 ZIP。
- Rust / rustup 诊断：检测 rustup、rustc、Cargo、已安装工具链、默认工具链和 MSVC Build Tools，支持切换 stable 与更新。
- .NET SDK 诊断：检测 SDK/Runtime 列表，识别项目 `global.json`，支持 restore、build 和 test 项目动作。
- 镜像加速中心：集中查看 npm、pip、GOPROXY、Maven、Gradle 和 Cargo 配置；可调用官方 RubyMetric/chsrc 进行固定目标的查看、测速、换源和恢复。
- 统一分页：独立列表超过 5 项时提供分页、总数与页码；端口表格每页 10 项。
- 端口管理：固定列宽排序、智能搜索、实时新增占用提醒、进程/父进程/Windows 服务解释、7 天历史、安全结束进程，以及 Spring Boot、Tomcat、Vite、`.env` 项目端口识别和备份修改。
- Docker Desktop 安装、更新、启动和关闭；WSL 更新、发行版安装、启动、停止和默认发行版管理。
- MySQL、PostgreSQL、Redis、MongoDB、Elasticsearch、SQL Server 服务检测、启动、停止、重启、日志和安装目录访问。
- MySQL 修复中心：只读发现遗失服务、`my.ini`、端口、Data 系统库与候选业务库；支持一次性注册/启动/备份/系统库修复计划，并强制执行备份门禁。
- 学习中心：介绍 Scoop、mise、vfox、uv、chsrc 的官方入口和适用边界，只允许运行固定版本、位置与环境检查命令。
- 程序内更新：每天最多自动检查一次，只读取固定更新清单，不上传遥测；下载包强制 SHA256 校验。
- C 盘急救大师 Phase 2：执行“扫描 → 选择 → 计划预览 → 二次确认 → 重新校验 → 回收站清理 → 验证 → 报告”；开发缓存优先调用官方命令。
- C 盘急救大师 Phase 3：桌面/下载分类、大文件 Top 100、按大小与 SHA256 的重复文件扫描，以及微信/QQ、浏览器缓存、网盘、剪辑软件、游戏库和 Windows 已安装软件占用分析；支持把普通文件加入只记录路径的归档计划，全部默认只读且不移动文件。
- C 盘急救大师 Phase 4：空间搬家、桌面/下载归档、Junction 桥接、回滚记录和 C 盘真扩容安全向导；分区检测只读，扩容仅安全 A/B 模式可执行并要求三次确认。
- 命令面板安全模式：仅允许常见开发工具，拦截系统 Shell、磁盘、注册表、权限、服务和破坏性 Git 命令。
- 统一风险说明：主要页面都有功能说明、风险等级、影响范围、可恢复性、备份建议和确认要求；首次启动会显示使用前说明，用户可在设置/安全说明中重新查看。
- AI Agent / CLI 痕迹分析：用户主动触发后只读检查可验证路径与项目配置文件名，不读取会话正文、history、token 或密钥。
- `devenv` CLI：环境诊断、可靠性快照、Java 修复计划、备份恢复、版本查看/切换、项目检查、清理扫描和配置模板应用；修改类 CLI 需要显式确认参数。
- 网络诊断、下载缓存管理、命令面板、自身卸载入口。
- 后台执行耗时任务，隐藏 Windows 命令窗口，减少闪屏和界面卡顿。

## 使用流程

1. 打开 Tauri 新版。
2. 在“总览”确认安装根目录，默认优先使用 `D:\DevEnvManager`。
3. 在“版本管理”安装或切换 JDK / Python / Node.js / Maven / Gradle。
4. 在“环境”先点击“检查可靠性”查看 raw/expanded 环境，再点击“预览配置”或生成 Java 稳定修复计划，核对差异后再确认写入用户级 `DEVENV_HOME`、`JAVA_HOME` 和受管 PATH。
5. 在“环境医生”点击“一键诊断”，查看评分、问题和建议。
6. 在“版本管理”的 Python 环境分析里检查 pip 是否和当前 Python 匹配。
7. 在“项目启动向导”选择项目目录，分析项目、只读读取 IDEA 配置，并验证 Nacos/Nexus 等 Java 消费者环境。
8. 在“端口”搜索 `8080`、`spring`、`mysql`、`vite` 等关键词快速定位冲突。
9. 在“工具链”检查 Git/GitHub、Node 和 Python 生态，需要时配置 Git 身份、包管理器或镜像源。
10. 在“平台/镜像”安装 Go、检查 Rust/.NET，或管理 GOPROXY、Maven 和 Gradle 镜像。
11. 在“C盘急救”先体检和扫描；需要清理时必须预览一次性计划并二次确认。空间搬家与扩容必须先生成计划，Junction/归档二次确认，分区扩容三次确认。

## 页面使用说明

| 页面 | 建议使用方式 |
| --- | --- |
| 总览 | 查看当前实际生效的 Java、Python、Node、Maven、Gradle、Go 版本和来源；每 30 秒只读刷新。 |
| 环境医生 | 先诊断，再按证据处理。评分只惩罚真实问题，可选工具缺失和普通端口占用不再扣分。 |
| 版本管理 | “本机环境发现”默认折叠；JDK 切换后使用“检查当前 JDK”验证完整生效链。 |
| 环境 | 只修改当前用户环境变量；先查看可靠性快照和实际差异，再确认写入并回读校验。可查看和恢复环境备份。 |
| 项目 | 支持选择文件夹；分析项目后预览 VS Code/IDEA 配置；可只读读取 IDEA 项目 JDK，并验证 Nacos/Nexus Java 环境。 |
| 工具链 | 检测并辅助配置成熟生态工具，不重新实现它们。 |
| 平台/镜像 | 可调用官方 chsrc；Windows 主机与 WSL 分开看待，WSL 内 SDK 优先使用 Linux 生态成熟工具。 |
| 学习中心 | 复制官方地址和检查命令；练习区只运行固定只读命令，不安装工具、不写环境变量。 |
| C盘急救 | Phase 2 仅清理用户明确选择且后端二次校验通过的项目；Phase 3 的桌面、下载、重复文件、软件与应用默认只读；Phase 4 的搬家、Junction、归档和扩容必须先预览计划并确认。 |
| 工具箱 | 命令面板属于高级功能。不要粘贴不理解的 AI、网页或聊天命令。 |

### Nacos 与最新用户环境

Nacos 启动前会重新读取 Windows 用户环境，而不是沿用 DevEnv Manager 启动时继承的旧 PATH。程序会确认 `JAVA_HOME` 同时包含 `java.exe` 与 `javac.exe`，回读 Java 版本后再显式注入 Nacos 子进程。环境修改后仍建议重新打开终端和 IDE。

1.5 继续强制用户级 `JAVA_HOME` 写入类似 `D:\DevEnvManager\current\jdk` 的真实绝对路径，不写 `%DEVENV_HOME%\current\jdk`。这是为了兼容不会二次展开环境变量的 Nacos、Maven、Gradle 和部分脚本；`DEVENV_HOME` 与 PATH 的受管条目仍会保留。

### MySQL 修复安全边界

- 诊断不读取数据库表、聊天或业务文件内容，也不采集密码。
- 不会在未确认时运行 `mysqld --console`，只生成命令并读取已有 `.err` 尾部。
- Data 修复前必须先由本程序完成完整备份；备份会核对 `ibdata1`、业务库目录和 `.frm`。
- 系统库补回只允许目标 `datadir\mysql` 不存在时执行，拒绝覆盖已有目录。
- 永不删除业务库、`ibdata1`、`ib_logfile*`；root 密码恢复只生成向导，密码只在数据库终端输入。

## 下载与 SHA256 校验

正式版本以 [GitHub Releases](https://github.com/weidonglang/DevEnv-Manager/releases) 为唯一主来源。国内镜像如后续提供，只作为备用入口，并应与 Release 中的 `SHA256SUMS.txt` 对照。

```powershell
Get-FileHash .\DevEnv.Manager_1.5.1_x64-setup.exe -Algorithm SHA256
Get-FileHash .\DevEnv.Manager_1.5.1_x64_en-US.msi -Algorithm SHA256
Get-FileHash .\devenv.exe -Algorithm SHA256
```

1.5.1 Final Stable 官方产物 SHA256：

| 文件 | SHA256 |
| --- | --- |
| `DevEnv.Manager_1.5.1_x64-setup.exe` | `645efdb09c2266b9eafe99e380eab43e0bf41a5f36bf8a017cac9806b3687609` |
| `DevEnv.Manager_1.5.1_x64_en-US.msi` | `80c69073e28fa68c28d67434ddc79089dba8957fba7e6c634cae2604ed38668c` |
| `devenv.exe` | `f5be783d0f22d1b7e0782ded2b3ce182f941ad546e22ff0a6363e759e89b61ed` |
| `dailytools-tauri.exe` | `1af3eb84016f70c0733f6c7d6ec6f8bdf31f2854e983e93949b6ae702d55b37a` |

## 命令行 CLI

安装包附带的 `devenv.exe` 可用于终端和自动化：

```powershell
devenv doctor
devenv doctor --json
devenv env inspect
devenv env inspect --json
devenv env plan java --jdk "D:\DevEnvManager\current\jdk"
devenv env apply <plan-id> --confirm-risk
devenv env verify
devenv env backups
devenv env restore <backup-name> --confirm-risk
devenv java verify
devenv python verify
devenv nacos verify <nacos-root>
devenv safety disclaimer
devenv safety risks
devenv list --json
devenv use jdk 21
devenv use python 3.12
devenv project check .
devenv cleanup scan --json
devenv db doctor mysql --json
devenv db repair-plan mysql <candidate-id> <action>
devenv profile list
devenv profile apply "Java 21 + Python 3.12"
```

## 开发运行

```powershell
cd tauri
npm install
npm run tauri:dev
```

## 打包发布

```powershell
cd tauri
npm run tauri:build
```

输出位置：

- `tauri\src-tauri\target\release\bundle\nsis\DevEnv Manager_1.5.2_x64-setup.exe`
- `tauri\src-tauri\target\release\bundle\msi\DevEnv Manager_1.5.2_x64_en-US.msi`
- `tauri\src-tauri\target\release\dailytools-tauri.exe`
- `tauri\src-tauri\target\release\devenv.exe`

### Release 体积记录

使用相同的 Rust release 配置（LTO、`opt-level = "z"`、strip）对实现前后裸 exe 进行对比：

| 文件 | 1.0.0 | Phase 1 | 1.1.0 | 1.3.0 | 1.4.0 | 1.5.0 | 1.5.1 | 1.5.1 相对 1.5.0 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `dailytools-tauri.exe` | 4,758,016 B | 4,726,272 B | 4,826,624 B | 5,047,808 B | 5,296,128 B | 5,678,080 B | 5,863,936 B | +185,856 B |
| `devenv.exe` | 2,073,600 B | 2,066,944 B | 2,102,784 B | 2,088,960 B | 2,148,352 B | 2,355,712 B | 2,350,080 B | -5,632 B |

1.5.1 增加官方 Tauri 目录选择插件和稳定性检查逻辑。GUI release exe 相对 1.5.0 增加约 181.50 KiB，CLI release exe 相对 1.5.0 减少约 5.50 KiB，低于本阶段体积约束。

## 测试

```powershell
cd tauri\src-tauri
cargo test

cd ..\
npm run build
```

## 安全说明

- 只修改当前用户级环境变量，不修改系统级环境变量。
- 下载使用 HTTPS 精确域名白名单，并逐跳验证重定向；覆盖 Adoptium、GitHub、Node.js、Python/NuGet、Apache、Gradle、Go、BellSoft 等官方源与明确 CDN。
- ZIP 解压阻止路径穿越。
- 删除和卸载受管运行时前会校验路径必须位于 DevEnv Manager 根目录内。
- 外部运行时优先使用 Windows 卸载注册表；Scoop/Chocolatey 项使用对应包管理器；严格识别的独立绿色运行时只移入回收站；IDE 内置 JDK 始终受保护。
- C 盘急救 Phase 2 的计划由后端根据本轮扫描生成、30 分钟过期且只能执行一次；执行前重新扫描并拒绝被篡改的 ID、路径、分类或风险。
- 普通临时文件和 DevEnv Manager 下载/旧日志优先移入 Windows 回收站；开发缓存只调用工具官方命令，命令缺失时不会回退为目录删除。
- 默认扫描不进入 Desktop、Downloads、Documents、Pictures、Videos、Music；`C:\Windows`、Program Files、当前项目、受管运行时、浏览器凭据和微信/QQ 数据库受保护，符号链接不会被跟随。
- WPS 只匹配明确命名的 cache/temp/log 路径，备份中心、云文档、账号数据和普通文档不进入结果，仍保持只读。
- Phase 3 不提供桌面/下载/重复文件删除，也不直接删除软件、游戏、微信/QQ、浏览器或网盘数据；只提供打开目录、系统卸载入口和迁移建议。
- Phase 4 空间搬家仅允许白名单源目录；禁止 Windows、Program Files、ProgramData\Microsoft、浏览器凭据、微信/QQ 数据库、受管运行时 current、当前项目和系统关键目录。
- Junction 桥接流程固定为复制到非 C 盘目标、校验大小与数量、源目录改名为 `.devenv-backup-*`、创建 Junction、写入回滚记录；失败会尽量恢复源目录。
- 桌面/下载归档只移动普通文件，跳过快捷方式、隐藏/系统文件、目录、符号链接和敏感路径；归档回滚以报告为准。
- C 盘扩容检测只读；扩容执行仅允许 `safe_extend_unallocated` 与 `delete_empty_adjacent_partition_then_extend` 计划，后者必须确认相邻空分区且三次输入确认。
- 项目配置只允许写入四个固定 VS Code/IDEA 文件；已有文件和切换前环境自动创建时间戳备份。
- chsrc 只接受固定目标和源 ID，不接受自定义 URL，也不通过 Shell 拼接命令。
- 命令面板不是 AI 自动执行器。系统 Shell、磁盘/注册表/权限/服务命令及破坏性 Git 命令会被拒绝；安装、更新、发布类命令需要二次确认。
- 结束进程会拦截 PID 0、PID 4、System、lsass.exe、csrss.exe、wininit.exe、winlogon.exe、services.exe 等关键进程。
- 导出诊断报告会脱敏用户目录和常见敏感键值，不导出私钥、token、密码。
- SSH Key 生成发现同名密钥时会拒绝覆盖，界面只允许复制公钥，绝不读取或显示私钥。
- npm 和 pip 镜像只能从内置白名单选择，工具安装包名使用固定白名单，避免拼接任意命令。
- Go 只从 `go.dev` 白名单下载，并使用官方索引提供的 SHA256 校验安装包。
- Maven/Gradle 只写用户目录中的固定配置文件；已有文件会先生成时间戳备份，界面提供最近备份恢复入口。
- 不包含账号系统、云同步、遥测、广告或联网统计。

## 免责声明

DevEnv Manager 是个人维护的 Windows 开发环境诊断与安全操作面板，主要用于帮助用户理解本机开发环境、PATH、JAVA_HOME、工具链、端口、缓存和本地服务状态。

本项目不会承诺处理所有系统问题，也不保证所有操作在所有 Windows 版本、硬件、磁盘布局、权限策略、杀毒软件、企业管控环境或第三方工具环境下都能成功。

涉及环境变量、PATH、运行时切换、服务管理、文件清理、空间搬家、Junction、数据库修复、分区扩容等操作前，用户应自行确认影响范围，并提前备份重要数据。

本项目默认采用只读诊断、计划预览、用户确认、备份和报告机制降低风险，但无法替代专业数据恢复、系统维护、磁盘分区、数据库运维或企业 IT 管理工具。

因用户误操作、未备份数据、强制执行高风险操作、手动删除备份、第三方软件冲突、系统权限限制、断电、磁盘故障或非预期环境差异导致的数据丢失、服务异常、系统无法启动、项目无法运行等后果，项目维护者不承担责任。

如果你不理解某项操作的影响，建议不要执行高风险操作，只使用只读诊断、报告导出和安全建议。

## 维护边界

DevEnv Manager 是个人维护项目，不承诺长期覆盖所有语言、SDK、包管理器和 Linux 发行版。维护优先级固定为：

1. 安全问题和数据保护
2. 可复现的明确 bug
3. 核心 JDK/Python/Node、PATH、端口诊断体验
4. 文档澄清和低风险、可测试功能

## 致谢

感谢所有提交 Issue、复现步骤、截图、日志和建议的用户。1.5.x 的环境可靠性中心、安全说明体系、Python 完整性检查、项目文件夹选择、IDEA 只读分析和 Java 消费者验证，均来自近期真实反馈。

项目同时感谢 OpenJDK、Python、Node.js、Maven、Gradle、Go、Rust、.NET、Tauri、RubyMetric/chsrc、Scoop、mise、vfox、uv 等生态项目。DevEnv Manager 的定位是解释、编排和保护这些成熟工具的使用边界，而不是替代它们。
5. 新生态扩展

新功能必须尽量满足低风险、可回滚、可测试和维护成本可控。涉及命令执行、清理、卸载、服务停止与受控修复的功能会采用更保守的默认行为。Windows 是主平台；WSL 以诊断和编排为主，完整 Linux 桌面版本需独立评估，不会简单照搬 Windows 实现。

## 常见问题

**为什么修改环境变量后当前终端没有变化？**  
已经启动的 CMD、PowerShell、IDE 不会自动继承新环境变量，请重新打开终端或 IDE。

**为什么选择 D 盘后安装到了 `D:\DevEnvManager`？**  
这是有意设计，避免把 `current`、`envs`、`downloads` 等目录直接散在 D 盘根目录。

**为什么 Python 安装后没有全局 `py` 命令？**  
受管 Python 使用官方 NuGet 完整包直接解压到 DevEnv Manager 根目录，并验证 `python`、`pip` 和 `venv`，但不会安装全局 Python Launcher，以免和已有系统 Python 抢占。建议使用受管 PATH 中的 `python`。

**为什么有些外部运行时仍不能卸载？**
IDE 内置 JDK、无法确认所有权的目录和未知便携版会被有意拦截。注册表、Scoop、Chocolatey 和严格识别的独立绿色运行时可直接处理。

**为什么 Maven / Gradle 要求 JAVA_HOME？**  
Maven 和 Gradle 需要有效 JDK。1.5 继续要求用户级 `JAVA_HOME` 写入真实绝对路径；受管命令执行时也会注入已验证的绝对 JDK 路径，安装或切换后会重新验证。Maven/Gradle 已存在目录时，安装按钮会重新登记、切换 current 并验证，而不是直接报“已安装”。

## 手动测试清单

- 全新 Windows 环境首次打开。
- 修改安装根目录，特别是选择 `D:\`。
- 安装 JDK 17/21，并切换验证。
- 安装 Python 3.12/3.14，并验证 `python -m pip --version`。
- 安装 Node.js 22，并验证 `npm --version`。
- 安装 Maven / Gradle，并验证 JAVA_HOME 处理。
- 在 Maven/Gradle 已存在目录的情况下再次点击安装，确认会修复登记、current 指针和验证结果。
- 配置用户环境变量后重新打开终端测试。
- 预览 DEVENV_HOME/JAVA_HOME/PATH 差异，确认写入前生成历史备份；恢复指定备份并确认恢复前状态再次备份。
- 同时安装多个 JDK，制造 JAVA_HOME、PATH、java、javac 不一致并检查明确告警。
- 用 Maven/Gradle 项目验证项目要求、JAVA_HOME 和构建工具 JVM 的匹配结果。
- 用 Nacos 目录验证 JDK 8+ 检查与固定 action id 启动入口。
- 故意制造重复或失效 PATH，再清理。
- 运行环境医生并导出报告。
- 检测多个 Python 和 Microsoft Store Python 别名。
- 扫描 8080、5173、3306、5432、6379 端口。
- 结束普通 node/java 进程，确认系统关键进程被拦截。
- 分析 Node/Python/Java/Tauri/Rust 项目。
- 预览并编辑 VS Code/IDEA 配置；确认已有文件和环境模板均生成时间戳备份。
- 验证超过 5 项的运行时、诊断、端口、服务、缓存和清理列表分页。
- 检查 chsrc 当前源/可用源/测速，并对换源和恢复操作验证二次确认。
- 清理下载缓存，确认项目逐项进入 Windows 回收站而不是永久删除。
- 在命令面板验证 `node --version` 可运行、`npm install` 需确认、PowerShell 与 `git reset --hard` 被拦截。
- 完成 C 盘急救扫描、勾选、计划、二次确认、清理、验证和 Markdown/JSON 报告；确认计划篡改与重复执行被拒绝。
- 分别运行 npm/pnpm/Yarn/pip/uv/Poetry/Go/NuGet 官方缓存命令；确认 Maven/Gradle/Cargo 仍为只读。
- 分类桌面和下载目录；验证旧文件、安装包、压缩包、截图、ISO 和 1GB 大文件统计。
- 在专用测试目录扫描大文件 Top 100 与 SHA256 重复文件；确认没有删除按钮。
- 检查微信/QQ、Chrome/Edge/Firefox、网盘、剪辑软件、Steam/Epic/WeGame 与 Windows 卸载表；确认只提供打开位置、迁移建议和系统卸载入口。
- 生成空间搬家计划；在测试目录执行 Junction 桥接，确认目标复制、源备份、Junction 创建、回滚记录和自动回滚。
- 生成桌面/下载归档计划，在测试目录或临时用户目录验证安装包、压缩包、视频、图片、ISO、旧文件分类移动，快捷方式和隐藏/系统文件跳过。
- 执行 C 盘扩容只读检测；用 mock/测试机器验证恢复分区阻挡、D 盘不相邻、D 盘不同物理盘和右侧未分配空间说明。
- 主动运行 AI Agent / CLI 痕迹分析，确认不展示 history、会话正文或敏感值。
- 启动自身卸载入口。
- 检查 Git 身份、Git LFS、SSH Key 和 GitHub HTTPS/SSH 状态。
- 配置测试用 Git 身份，确认刷新后立即显示；已有 `id_ed25519` 时确认不会覆盖。
- 检查 npm/pnpm/Yarn/Corepack，切换 npm 官方源与 npmmirror 后验证。
- 检查 pip/uv/Poetry/virtualenv，切换 PyPI 镜像并安装一个缺失工具后验证。
- 安装并切换 Go 1.25/1.26，验证 `go version` 与 `go env`。
- 切换 GOPROXY 后重新检查，确认只修改当前用户环境变量。
- 检查 rustup、Rust 工具链和 MSVC Build Tools，执行 stable 切换。
- 检查 .NET SDK/Runtime，并用含 `global.json` 的项目验证版本匹配提示。
- 写入 Maven/Gradle 测试镜像，确认先生成备份，再测试最近备份恢复。
- 打包 Tauri 安装包。

## 路线图

已实现的 P0 / P1 / P2：

- 环境医生
- Python 多版本冲突分析
- 项目启动向导
- 诊断报告导出
- 配置模板保存和恢复
- 安装进度和切换后验证
- Git / GitHub 基础诊断、身份配置、SSH Key 生成与连接测试
- Node.js 包管理器检测、安装、registry 和全局目录管理
- Python 工具链检测、安装和 pip 镜像管理
- 统一工具元数据注册表
- Go 受管安装、切换、卸载和代理管理
- Rust/rustup 与 MSVC Build Tools 诊断
- .NET SDK/Runtime 与 `global.json` 诊断
- Maven/Gradle 镜像配置备份和恢复
- 端口进程解释、Windows 服务映射和 7 天历史
- Docker / WSL 与数据库本地服务检查
- 配置模板导入、导出和团队分享
- Markdown/JSON 脱敏诊断报告和复制分享
- 项目 JDK 建议、JDK 发行版扩展结构和更新检查
- C 盘急救大师 Phase 1 安全底座、磁盘体检与只读扫描
- C 盘急救大师 Phase 2 一次性清理计划、回收站执行、官方开发缓存命令与 Markdown/JSON 报告
- C 盘急救大师 Phase 3 桌面/下载、大文件、重复文件与常见应用/软件/游戏只读占用分析
- 环境配置差异预览、一次性确认、历史备份、指定恢复与回读验证
- VS Code/IDEA 项目配置预览、细微编辑、文件备份与切换前环境模板
- RubyMetric/chsrc 固定参数集成与侧边栏工作流分组
- 独立长列表统一分页
- `devenv` 命令行工具
- Temurin、Zulu、Liberica、Microsoft OpenJDK 自动安装
- 程序内下载、SHA256 校验和自动升级
- Docker Desktop、WSL 发行版和数据库服务管理
- 项目端口配置识别、备份修改和占用提醒
- 配置模板差异预览和缺失版本补齐
- 环境医生安全一键修复
- 命令面板白名单与管理员态保护
- JDK/JAVA_HOME/PATH/java/javac/Maven/Gradle 一致性诊断
- Nacos Java 环境识别与受管启动
- AI Agent / CLI 痕迹只读分析

后续规划：

- 优先增加真实 Windows 环境的自动化安装与多 JDK 回归测试，不无限扩展新生态。
- 继续增加真实 Windows 环境的下载重定向、回收站恢复和官方缓存命令自动化回归。
- 评估 WSL 内只读 SDK 诊断；不承诺短期完整 Linux 桌面版。

## 旧版 Python 开发运行

要求 Windows 10/11 和 Python 3.11 或更高版本。

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

旧版打包：

```powershell
.\build_exe.bat
```

输出位于 `dist\DevEnvManager.exe`。
