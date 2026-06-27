# 环境变量稳定性设计

DevEnv Manager 1.5 的重点是让 Windows 开发环境修改更透明、更可恢复。环境页不再只展示最终结果，而是展示当前进程环境、Windows 用户环境、PATH 命中顺序和工具来源。

## 环境快照

可靠性快照包含：

- 当前进程环境：DevEnv Manager 启动时继承的 `JAVA_HOME`、`DEVENV_HOME` 和 PATH。
- Windows 用户环境：新终端通常会读取的用户级环境变量。
- raw value：注册表或进程里保存的原始字符串。
- expanded value：展开 `%DEVENV_HOME%` 等变量后的真实路径。
- PATH 分析：每一项是否存在、是否重复、是否来自 DevEnv Manager、是否是旧受管条目、是否包含 Java/Python/Node 工具。

当前进程环境和用户环境不同很常见。修改用户环境后，已经打开的终端、IDE、服务和 Daemon 可能仍使用旧值，因此需要重新打开相关程序后再验证。

## JAVA_HOME 写入规则

`JAVA_HOME` 必须写入真实绝对 JDK 根目录，例如：

```text
D:\DevEnvManager\current\jdk
```

拒绝写入：

- `%DEVENV_HOME%\current\jdk` 这类间接引用。
- JDK 的 `bin` 目录。
- 不存在的路径。
- 缺少 `bin\java.exe` 或 `bin\javac.exe` 的目录。
- JRE 或残缺 JDK。

这样做是为了兼容 Nacos、Maven、Gradle、批处理脚本和部分第三方工具。它们有时不会对 `JAVA_HOME` 再做一次变量展开。

## PATH 合并规则

默认策略：

- 保留用户已有未知 PATH。
- 不修改系统级 PATH。
- 去重完全相同或大小写等价的条目。
- 删除旧 DevEnv Manager 根目录遗留的受管条目。
- 将当前 DevEnv Manager 受管条目放到 PATH 前部。
- 修改前后展示 diff。

受管 PATH 包括：

```text
%DEVENV_HOME%\current\jdk\bin
%DEVENV_HOME%\current\python
%DEVENV_HOME%\current\python\Scripts
%DEVENV_HOME%\current\node
%DEVENV_HOME%\current\maven\bin
%DEVENV_HOME%\current\gradle\bin
%DEVENV_HOME%\current\go\bin
%DEVENV_HOME%\tools\npm-global
```

## Java 生效解析

Java 检查会同时读取：

- 用户级 `JAVA_HOME` raw/expanded。
- `JAVA_HOME\bin\java.exe` 与 `javac.exe`。
- 用户 PATH 中首个 `java.exe` 与 `javac.exe`。
- `java -version` 与 `javac -version`。
- Maven/Gradle 实际使用的 Java。
- DevEnv Manager 受管 JDK、系统 JDK、Scoop/Chocolatey/IDE 候选 JDK。

如果 `JAVA_HOME` 与 PATH 首个 Java 不一致，页面会提示风险，但不会删除外部 JDK 或接管 IDE 内置 JDK。

## Python / pip 生效解析

Python 检查会展示：

- 当前 `python` 和 `pip` 路径。
- `python -m pip --version` 与 `pip --version` 的归属。
- `py -0p` 发现的解释器。
- Microsoft Store Alias 风险。
- 当前进程 PATH 是否落后于用户 PATH。

`pip.exe` 不一定属于当前 `python.exe`。建议使用 `python -m pip` 来减少多版本混用造成的误判。

## Node / npm 基础检查

Node 检查覆盖：

- `node -v`
- `npm -v`
- `npx -v`
- `corepack --version`
- `npm config get prefix`
- `npm config get registry`
- `pnpm store path`

检查只解释状态，不删除用户全局包。

## Maven / Gradle 验证

Maven/Gradle 已存在目录时可以重新登记、切换 `current` 指针并验证可执行文件。验证会使用当前绝对 `JAVA_HOME` 执行 `mvn -version` / `gradle -version`。

Gradle 输出中的分隔线会被跳过，不再显示为版本号。

## Nacos 验证

Nacos 专项验证会检查：

- `nacos_root\bin\startup.cmd` 是否存在。
- 最新用户环境中的 `JAVA_HOME`。
- `JAVA_HOME\bin\java.exe` 与 `javac.exe`。
- Nacos 子进程会看到的 `JAVA_HOME` 与 Java 路径。
- `JAVA_HOME` 是否为间接引用。

Nacos 启动失败不一定是 JDK 没装，也可能是环境变量生效范围或写法问题。

## 备份与恢复

所有环境修改都按以下流程执行：

```text
快照 → 计划 → diff → 用户确认 → 备份 → 写入 → 广播 → 验证 → 报告
```

计划 30 分钟过期，只能执行一次。执行前会重新读取用户环境，如果环境已经变化，计划会被拒绝，需要重新生成。

恢复备份前也会先保存当前状态。恢复只作用于当前用户级环境变量，完成后会广播环境变化并重新验证 Java/Python/Node。
