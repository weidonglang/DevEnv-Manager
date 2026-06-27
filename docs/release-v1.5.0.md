# DevEnv Manager 1.5.0

Release 标题：DevEnv Manager 1.5.0：环境变量稳定性、功能说明与安全警告增强

本版本聚焦 DevEnv Manager 的基础可靠性与安全解释体验。新增统一环境快照、`JAVA_HOME`/PATH 生效解释、Java 稳定修复计划、Python/pip 一致性检查、Maven/Gradle 幂等验证、Nacos `JAVA_HOME` 专项验证、环境备份恢复中心，以及统一风险等级、功能说明卡片、危险操作确认、首次启动安全说明和报告风险尾部。

环境变量、C 盘清理、空间搬家、Junction、C 盘扩容、数据库修复和命令面板等高风险操作均补充了更明确的影响说明、备份建议和恢复提示。所有环境修改仍然只作用于当前用户级环境变量，并遵循预览、备份、应用、验证、恢复流程。

## GitHub Issue

- #44：新增 Python/pip 可靠性检查，识别 `pip.exe` 与当前 `python.exe` 不一致、缺少 pip、`py -0p` 多版本和 Store Alias 风险。
- #45：Gradle 输出跳过分隔线，优先展示有意义版本或 JVM 行。
- #46：环境医生扩展工具检测优先读取最新用户 PATH，减少 Go 已安装但当前进程 PATH 过期造成的误报。
- #47：主要页面补充功能说明、风险等级、确认要求和安全说明文档。
- #48：Java 稳定修复计划支持选择本地 JDK 根目录，拒绝间接引用、bin 目录和缺少 javac 的目录，并补充项目定位、感谢和安全边界说明。

## 新增 CLI

```powershell
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
```

## 验证

发布前需要通过：

```powershell
cd tauri\src-tauri
cargo test --all-targets
cargo clippy --all-targets -- -D warnings

cd ..\
npm run build
npm run tauri:build
```

## 体积记录

| 文件 | 大小 | SHA256 |
| --- | ---: | --- |
| `dailytools-tauri.exe` | 5,678,080 B | `4c24add9b1ed6976425cc8f98ca899503a8465d99be23c18daa727c91a9ad805` |
| `devenv.exe` | 2,355,712 B | `eeaec7377911bd6e65831e42f05234a6fcdad4a34f097ec427505fe3b281d343` |
| `DevEnv.Manager_1.5.0_x64-setup.exe` | 2,439,739 B | `af191848729f533d99ab78662a52260f77340c3c4d55f1011f71f3f7b576e582` |
| `DevEnv.Manager_1.5.0_x64_en-US.msi` | 4,165,632 B | `e30cc4a71e01de1c8f12f5c0e2cfc4e213c7efab6c42bfe15dfbc7ed37614221` |

Phase 5 不引入大型依赖，新增体积验收线为相对 1.4.0 不超过 5 MB。
