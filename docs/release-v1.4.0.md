# DevEnv Manager 1.4.0

发布日期：2026-06-25

## 重点更新

- C 盘急救大师 Phase 4：空间搬家、桌面/下载归档、Junction 桥接、回滚记录和 C 盘真扩容安全向导。
- 修复 `JAVA_HOME=%DEVENV_HOME%\current\jdk` 导致 Nacos、Maven、Gradle 或批处理脚本无法识别 JDK 的问题。1.4 起用户级 `JAVA_HOME` 写入真实绝对路径。
- Maven/Gradle 安装改为幂等修复：目标目录已存在时重新验证、登记、切换 `current`，不再直接报“已安装”。
- 新增 Python 修复闭环、MySQL 修复中心、学习中心和成熟开源工具推荐。
- 补强 Windows 中文命令输出解码和 SHA256 文本解析，降低下载校验误判。

## C 盘急救 Phase 4

新增：

- `MovePlan` / `MoveResult` / `RollbackRecord`。
- 空间搬家计划、执行报告和回滚入口。
- 桌面/下载目录归档到非 C 盘目标。
- 白名单缓存目录 Junction 桥接。
- 分区布局只读检测：C 盘所在磁盘、右侧相邻分区、未分配空间、恢复分区阻挡、D 盘是否同盘。
- C 盘扩容计划：只允许 `safe_extend_unallocated` 和 `delete_empty_adjacent_partition_then_extend` 两类安全计划执行。

安全边界：

- Junction 执行前复制源目录到目标盘，并校验文件数量和总大小。
- 源目录会先改名为 `.devenv-backup-*`，Junction 创建成功后写回滚记录。
- 桌面/下载归档跳过快捷方式、目录、符号链接、隐藏/系统文件和敏感路径。
- 分区扩容必须三次确认；恢复分区阻挡、D 盘不相邻、有数据或不同物理磁盘时只生成解释报告。

## 已处理 Issue

- #35：主页/学习中心新增 Scoop、mise、vfox、uv、chsrc 官方入口。
- #36/#42：修复 Nacos/JAVA_HOME 间接变量展开问题。
- #37：新增教学板块和只读命令练习。
- #38：新增 MySQL 修复中心。
- #39：新增 Python 修复、pip/PATH/Store Alias 诊断和修复计划。
- #41：Maven/Gradle 已安装目录可重新登记、切换和验证。

## 校验

```powershell
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
npm run build
npm run tauri:build
cargo build --release --bin devenv
```

## SHA256

```text
76caffdbc4cd3706e223085887c01a7ac6da0f8539a14682499a9f4b1a58c1cb  DevEnv.Manager_1.4.0_x64-setup.exe
3bc7ab0d6108bcd952b1e5c9eecaffb47745c6edd2a6a58e058092c06693b63f  DevEnv.Manager_1.4.0_x64_en-US.msi
d1bf6d44563282f55bcdd47c2664d1edd4dcf8c82265de317f24dfdae5bcb579  devenv.exe
```

## 体积

- `dailytools-tauri.exe`：5,296,128 B，相对 1.3.0 增加 248,320 B。
- `devenv.exe`：2,148,352 B，相对 1.3.0 增加 59,392 B。

Phase 4 相对 1.3.0 明显低于 15 MB 体积上限。
