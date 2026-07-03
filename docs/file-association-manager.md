# 文件打开方式管理器

DevEnv Manager v1.7.0 新增“工具箱 -> 文件打开方式管理器”，用于安全查看和管理常见文件类型的默认打开方式。

## 能做什么

- 只读扫描常见文本、代码、图片、文档、压缩包、音视频和开发产物扩展名。
- 展示当前默认应用、ProgID、打开命令、程序路径、来源和风险。
- 按扩展名或按目标应用生成修改计划。
- 执行前写入 JSON 备份。
- 对可恢复的当前用户级关联提供回滚入口。
- 对 Windows UserChoice 保护项打开系统默认应用设置，由用户确认。

## 只读操作

扫描、查看详情、复制当前命令、导出报告、打开 Windows 设置都不会修改注册表。

## 修改操作

自动执行只写当前用户级 `HKCU\Software\Classes` 下的扩展名关联和 DevEnv Manager 专属 ProgID。它不会写 `HKLM`，不会删除系统 ProgID，也不会要求管理员权限作为普通路径。

## 为什么不直接写 UserChoice

Windows 现代版本会保护默认应用选择。直接伪造写入 `UserChoice` 可能失败，也可能让界面显示“成功”但系统实际没有接受。DevEnv Manager 只读取并展示 `UserChoice`，遇到这类项目会提示进入 Windows 默认应用设置。

## 备份与回滚

每次执行前都会在 `%APPDATA%/DevEnv Manager/file-associations/backups/` 写入备份。备份失败时拒绝执行。回滚会恢复可恢复的当前用户级关联；原状态来自 `UserChoice` 的项目仍需要在 Windows 设置中确认。

## 高风险类型

`.exe`、`.msi`、`.reg`、`.bat`、`.cmd`、`.ps1`、`.vbs`、`.scr` 默认只读，不能批量静默修改。高级模式只允许单项计划，并要求多次确认和后端 confirmation token。
