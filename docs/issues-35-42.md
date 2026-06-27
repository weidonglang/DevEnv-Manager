# Issues #35–#48 实现说明

本文件记录 1.4.0 与 1.5.0 中对近期 GitHub Issue 的处理结果，以及与 C 盘急救 Phase 4、环境可靠性 Phase 5 的安全边界。

## #35 开源项目推荐

首页与学习中心新增 Scoop、mise、vfox、uv、chsrc 官方入口。学习中心只提供只读检查命令练习，不安装工具、不写环境变量。

## #36 / #42 JAVA_HOME 与 Nacos

Nacos 启动前会重新读取最新用户环境，验证 `JAVA_HOME\bin\java.exe` 与 `javac.exe`，并显式注入子进程。

1.4.0 起，用户级 `JAVA_HOME` 不再写 `%DEVENV_HOME%\current\jdk`，而是写真实绝对路径，例如：

```text
D:\DevEnvManager\current\jdk
```

这样可以兼容不会二次展开 `%DEVENV_HOME%` 的 Nacos、Maven、Gradle、批处理脚本和部分第三方工具。`DEVENV_HOME` 与 PATH 里的受管条目仍会保留。

## #37 教学板块

新增“学习中心”，覆盖：

- 常见版本/位置检查命令。
- Scoop、mise、vfox、uv、chsrc 的适用边界。
- 固定只读命令白名单；安装、删除、Shell、发布、配置命令由后端拒绝。

## #38 MySQL 修复中心

新增 MySQL 修复中心：

- 只读发现服务、`mysqld.exe`、`my.ini`、`basedir`、`datadir`、端口、Data 健康、MySQL 5.x 系统表和候选业务库。
- 支持一次性计划：备份、注册服务、启动服务、补回缺失系统库、root 认证恢复向导、导出向导。
- Data 修复前必须由本程序完成同一 Data 的备份；拒绝覆盖已有 `datadir\mysql`。
- 不读取业务表内容，不记录数据库密码。

## #39 Python 修复

新增 Python 修复闭环：

- 检查当前 `python`、`pip`、`py` 路径与版本。
- 检查 pip 是否属于当前 Python。
- 检查 Microsoft Store Python Alias 风险和用户 PATH 是否在当前进程生效。
- 修复前生成一次性计划，写环境前备份，执行后验证 `python -m pip --version`。
- SHA256 文本解析只接受目标文件名对应的 64 位十六进制哈希；Windows 中文命令输出增加 ANSI/UTF-16LE 解码兜底。

## #41 Maven/Gradle 显示已安装但不可用

Maven/Gradle 安装按钮改为幂等：

- 如果目标目录不存在，按原流程下载、解压、验证。
- 如果目标目录已存在，不再直接返回错误；会重新验证可执行文件、登记安装记录、切换 `current` 指针。
- 受管 Maven/Gradle 命令使用已验证的绝对 `JAVA_HOME`，避免间接环境变量展开失败。

## #44 pip 与当前 Python 不一致

1.5.0 新增 Python/pip 可靠性检查：

- 展示当前 `python`、`pip`、`python -m pip --version` 与 `py -0p`。
- 判断 `pip.exe` 是否属于当前 `python.exe`。
- 检测 Microsoft Store Alias 风险。
- 优先建议使用 `python -m pip`。

程序不会卸载其他 Python，也不会自动关闭 Store Alias。

## #45 Gradle 显示异常

Gradle 输出中的分隔线会被跳过。环境医生和 Java 环境检查会优先展示有意义的版本行或 JVM 行，避免把 `------------------------------------------------------------` 当作状态。

## #46 Go 可选缺失误报

环境医生扩展工具检测优先读取最新 Windows 用户 PATH，再回退到当前进程 PATH。这样可以减少 Go 已安装、但 DevEnv Manager 进程还没有重启时的误报。

Go 仍然属于可选工具；只有 Go 项目或 Go 生态功能需要它。

## #47 功能讲解、原理和风险说明

1.5.0 新增统一安全说明模块和前端组件：

- 风险等级：Info、Low、Medium、High、Critical。
- 主要页面提供功能说明、不会做什么、适合场景、风险等级、备份建议和恢复说明。
- 中高风险操作要求确认；极高风险操作要求三次确认。
- README、用户手册、报告和安全说明文档补充免责声明。

## #48 Java 配置不生效与本地导入

1.5.0 新增 Java 稳定修复计划：

- 用户可输入本地 JDK 根目录。
- 拒绝 `%DEVENV_HOME%` 间接引用。
- 拒绝 `bin` 目录。
- 拒绝缺少 `bin\java.exe` 或 `bin\javac.exe` 的目录。
- 写入前展示 diff 和备份名，写入后重新验证 Java、javac、Maven、Gradle 与 Nacos 相关环境。

这相当于给本地 JDK 提供安全导入与稳定化入口，但不会接管 IDE 内置 JDK、Scoop、Chocolatey 或系统外部运行时。

## Phase 4：空间搬家与扩容

新增 C 盘急救 Phase 4：

- MovePlan / MoveResult / RollbackRecord。
- 空间搬家、桌面/下载归档、Junction 桥接。
- 回滚记录列表与自动回滚入口。
- 分区布局只读检测、C 盘扩容安全计划与报告。

安全边界：

- 源目录必须在白名单内。
- 目标不能在 C 盘。
- Junction 必须复制、校验、备份源目录后创建。
- 桌面/下载归档跳过快捷方式、目录、符号链接、隐藏/系统文件和敏感路径。
- 扩容只允许 `safe_extend_unallocated` 与 `delete_empty_adjacent_partition_then_extend` 计划；其他模式只解释原因。

## 验证

本地验证项：

```powershell
cd tauri\src-tauri
cargo test --all-targets

cd ..\
npm run build
```

发布前还需要运行 `npm run tauri:build` 并回填 release installer 的 SHA256。
