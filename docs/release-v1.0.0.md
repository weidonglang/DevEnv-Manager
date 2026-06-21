# DevEnv Manager 1.0.0

DevEnv Manager 1.0 是 Tauri 2 + Rust 重构版的首个正式版本，面向 Windows 10/11 x64。

## 重点更新

- 完整管理 JDK、Python、Node.js、Maven、Gradle、Go 与常见生态工具。
- Python 改用官方 NuGet 完整包，直接安装到受管目录，并验证 `python`、`pip` 与 `venv`。
- 支持 Temurin、Zulu、Liberica 和 Microsoft OpenJDK 自动安装与切换。
- 新增 `devenv` CLI，可执行诊断、版本切换、项目检查、清理扫描和配置恢复。
- 新增安全存储清理，先扫描预览，再将选中内容移入 Windows 回收站。
- 配置模板支持导入差异预览、缺失运行时自动补齐和环境变量恢复。
- 环境医生新增安全修复；端口中心支持实时提醒和项目端口配置备份修改。
- Docker Desktop、WSL 发行版和常见数据库 Windows 服务可视化管理。
- 更新包在程序内下载并校验 SHA256 后启动安装。

## 下载

- `DevEnv.Manager_1.0.0_x64-setup.exe`：推荐的 NSIS 安装包。
- `DevEnv.Manager_1.0.0_x64_en-US.msi`：MSI 安装包。
- `devenv.exe`：独立命令行工具。
- `SHA256SUMS.txt`：发布文件校验值。

安装程序在选择盘符根目录时会自动创建 `DevEnvManager` 文件夹。应用支持从设置页卸载自身。

## 安全边界

环境变量默认只写当前用户；运行时安装、便携版卸载和存储清理都执行根目录校验；系统关键进程、IDE 内置 JDK、用户文档和浏览器个人数据受到保护。
