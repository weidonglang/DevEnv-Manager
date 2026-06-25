# Issue #35–#39 实现与安全说明

## #35 优秀开源项目推荐

首页与学习中心列出 Scoop、mise、vfox、uv、RubyMetric/chsrc 的官方入口、检查命令和适用边界。页面只复制链接和固定检查命令，不替这些项目安装软件或接管配置。

## #36 Nacos 无法识别 Java

Nacos 启动不再依赖 DevEnv Manager 进程启动时继承的旧环境。每次执行前重新读取 Windows 当前用户环境，选择同时包含 `java.exe`/`javac.exe` 的 JDK，回读版本，并显式设置子进程 `JAVA_HOME` 与去重后的 PATH。验证失败时拒绝启动。

## #37 教学板块

学习中心提供只读命令练习区。后端只接受固定版本、位置和环境查询；`pip install`、Shell、环境写入、删除和发布命令均被拒绝。所有配置仍在原功能页完成预览、备份和确认。

## #38 MySQL 修复中心

实现常见 MySQL/MariaDB 安装发现、Windows 服务匹配、`my.ini` 解析、端口检测、Data 系统库健康、业务库目录候选和 `.err` 尾部读取。修复操作使用后端一次性计划，30 分钟过期并在执行前重新诊断。

Data 保护规则：

- 不读取表内容，不接收数据库密码。
- 不删除 `ibdata1`、`ib_logfile*` 或业务库。
- 备份目标必须为空、位于 Data 外部且不是符号链接。
- 系统库修复要求 24 小时内由本程序完成的同一 Data 备份。
- 仅当目标 `datadir\mysql` 不存在时复制，拒绝覆盖。
- root 密码处理只生成版本区分向导，不执行或记录密码 SQL。

CLI 只提供 `db doctor mysql` 与 `db repair-plan mysql`，不提供绕过 GUI 确认直接修改 Data 的入口。

## #39 Python 修复闭环

分析覆盖默认 `python`/`pip`、`py -0p`、Launcher 路径、用户 PATH、当前进程 PATH 是否过期、Store 别名和多版本来源。修复计划展示精确 Python、pip 命令与 PATH 新增项，10 分钟过期且只能使用一次；执行前检查用户环境指纹并备份，执行后回读 `python -m pip --version`。

命令输出支持 UTF-16、UTF-8 和 Windows 当前代码页回退。校验文本只接受目标文件对应的 64 位十六进制 SHA-256，拒绝把说明文字当作哈希。

## Phase 3 回归

桌面、下载、大文件、重复文件和应用分析仍保持只读。普通大文件或重复候选可加入持久化归档计划，但 Phase 3 只记录路径和大小，不移动文件；系统、当前项目、受管运行时、聊天数据和浏览器凭据会被拒绝。
