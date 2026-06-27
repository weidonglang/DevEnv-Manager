# C 盘急救 Phase 2/3/4 安全架构

1.3.0 在 Phase 1 只读扫描之上开放有限清理能力，并加入严格只读的个人目录与应用占用分析。执行链固定为：

```text
scan → select → preview plan → confirm → rescan/verify → clean → verify → report
```

## 可执行范围

- 用户 `%TEMP%` 与 LocalAppData Temp 中超过 24 小时的普通项目。
- DevEnv Manager 下载缓存。
- DevEnv Manager `logs` 中超过 24 小时的旧日志。
- 上述范围内的普通 `.tmp`、`.log`、`.bak` 与空目录。

普通文件与目录使用 `trash` 进入 Windows 回收站，不调用永久删除。下载缓存旧入口也已统一到同一回收站实现。

## 开发缓存

开发缓存不直接删除路径，只调用官方命令：npm、pnpm、Yarn、pip、uv、Poetry、Go build/module cache 与 NuGet locals。

命令解析会优先检查 DevEnv Manager 当前受管 Node、Python、Go 目录，再检查当前 PATH。命令缺失时返回明确错误，不回退为目录删除。

Maven `.m2/repository`、Gradle caches、Cargo registry/cache 与 Cargo target 只扫描。

## 一次性计划

`create_cleanup_plan` 会重新扫描并根据用户选择的候选 ID 生成计划。计划：

- 不接受高风险、critical 或 `cleanable=false` 项。
- 保存在后端内存中，客户端不能自行构造有效计划。
- 30 分钟过期，只能执行一次。
- 包含路径、分类、大小、风险、动作和可恢复标记。

`clean_selected_targets` 会取出原始计划并进行完整相等比较，然后再次扫描。ID、路径、分类或可清理状态发生变化时整项计划被拒绝。

执行每个路径前再次检查：

1. 路径仍然存在。
2. 不属于保护路径。
3. 不是符号链接。
4. 仍是本轮扫描的同一候选。
5. 清理后路径已经消失，才计入释放空间。

## 永久保护范围

- Windows、Program Files、ProgramData\Microsoft。
- Windows Temp、Windows Update、Windows.old、回收站、系统还原点。
- `hiberfil.sys`、`pagefile.sys`、`swapfile.sys`。
- Desktop、Downloads、Documents、Pictures、Videos、Music。
- 当前项目与 DevEnv Manager 受管运行时。
- 浏览器用户目录与凭据。
- 微信、QQ 数据库和用户数据。
- WPS 文档、备份中心、云同步和账号数据。
- 符号链接、junction 与未知来源路径。

## 报告

每次执行记录计划 ID、起止时间、实际释放字节、完成/跳过/失败数量和失败原因。最后一次报告可导出 Markdown 或 JSON。

报告不包含文件内容、账号信息、令牌、Cookie、密码或聊天数据。

报告尾部统一包含“风险与限制”说明：

- 报告基于扫描时刻生成，环境可能已经变化。
- 执行修改类操作前请重新扫描并确认。
- 被跳过的路径通常属于系统目录、用户资料、敏感账号数据、浏览器登录数据、聊天数据库、受管运行时或当前项目。
- 程序无法判断所有文件的业务价值，删除或移动前请确认用途。

## Phase 3 只读分析边界

- 大文件仅接受用户目录或用户明确选择的非系统目录，限制 Top 100，并跳过符号链接和敏感应用数据目录。
- 重复文件先按大小分组，仅对候选流式计算 SHA256；结果不进入清理计划，也没有删除命令。
- Desktop 与 Downloads 只读取文件元数据用于分类和统计，不自动展开 Documents、Pictures、Videos、Music。
- 微信/QQ 只统计已知数据根目录的总量，不读取、哈希或展示数据库内容。
- Chrome/Edge 只扫描 Cache、Code Cache、GPUCache；Firefox 只扫描 cache2 与 startupCache。Cookie、Login Data、密码库和登录态永远不进入结果或清理项。
- 软件信息只读 Windows 卸载注册表；程序不执行注册表中的卸载字符串，只打开 Windows“已安装的应用”。
- 游戏库、网盘和创作软件只提供占用与迁移建议，不删除、不移动目录。

## Phase 4 搬家与扩容边界

- 空间搬家只允许白名单源目录，并要求目标不在 C 盘。
- Junction 桥接必须复制、校验、备份源目录后创建，并写入回滚记录。
- 桌面/下载归档跳过快捷方式、目录、符号链接、隐藏/系统文件和敏感路径。
- 扩容检测只读；执行分区写入前必须生成计划、备份重要数据并三次确认。

扩容报告会额外说明：检测报告不代表一定适合执行扩容；恢复分区、BitLocker、厂商恢复工具、多系统环境或非相邻分区都应谨慎处理。
