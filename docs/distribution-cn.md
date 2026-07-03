# 国内下载与双平台发布

DevEnv Manager v1.7.0 起支持 GitHub + Gitee 双平台发布，并在软件内检查更新时使用多源 fallback。

## 发布源

- GitHub 是国际主仓库和全球 Release 源。
- Gitee 是国内镜像和国内 Release 下载入口。
- 两个平台使用同一个 tag、同一个安装包文件名和同一个 SHA256。

## 更新清单

稳定版使用 manifest schema v2：

- `update-manifest.json`：GitHub Release 上的全球清单。
- `update-manifest.cn.json`：Gitee Release 上的国内清单。
- `assets[].mirrors` 同时包含 Gitee 和 GitHub 下载链接。

软件默认按优先级尝试 Gitee，再尝试 GitHub。单个源失败不会显示“没有更新”，只有全部源失败时才提示“更新源不可用”。

## Gitee API Token

发布脚本从环境变量读取：

- `GITEE_TOKEN`
- `GITEE_OWNER`
- `GITEE_REPO`

Token 只用于 DevEnv Manager Release 自动化。不要把 token 写入 README、docs、issue、PR、release notes、脚本参数日志或 `.env`。

## SHA256 校验

安装包下载完成后必须计算 SHA256 并与 manifest 中的值完全一致。校验失败时删除下载文件并拒绝安装。手动下载用户也可以用：

```powershell
Get-FileHash .\DevEnv.Manager_1.7.0_x64-setup.exe -Algorithm SHA256
```
