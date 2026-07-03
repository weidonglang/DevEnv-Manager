# DevEnv Manager v1.7.0

v1.7.0 是功能版本，完成 #93 文件默认打开方式管理器和 #94 双平台发布 / 国内多源更新。

## #93 文件默认打开方式管理器

- 新增工具箱入口。
- 支持常见扩展名扫描、来源识别、风险分类和程序路径存在性检查。
- 支持按扩展名、按应用生成计划。
- 执行前必须创建备份。
- 受 Windows UserChoice 保护的项目不直接写入，改为打开系统默认应用设置。
- 高风险扩展名默认只读，走高级确认和后端 token。
- 支持备份列表、备份目录打开和可恢复项目回滚。

## #94 双平台发布与国内多源更新

- update manifest 升级到 schema v2。
- 支持 Gitee + GitHub manifest fallback。
- 下载支持 mirrors fallback。
- 下载后强制 SHA256 校验。
- 新增 Gitee Release 自动发布脚本。
- 新增 v1.7 发布脚本和国内分发文档。

## 验收重点

- GitHub 和 Gitee tag 一致。
- GitHub 和 Gitee asset 文件名一致。
- GitHub 和 Gitee asset SHA256 一致。
- `update-manifest.json` 和 `update-manifest.cn.json` 包含双平台 mirrors。
- Gitee token 未写入仓库文件。
