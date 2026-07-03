param(
  [string]$Version = "1.7.0",
  [switch]$SkipBuild,
  [switch]$SkipGithubRelease,
  [switch]$SkipGiteeRelease
)

$ErrorActionPreference = "Stop"

function Assert-CleanWorktree {
  $status = git status --porcelain
  if (![string]::IsNullOrWhiteSpace($status)) {
    throw "Working tree is not clean. Commit or stash changes before running the release script."
  }
}

function Invoke-Step([string]$Name, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "==> $Name"
  & $Action
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$tag = "v$Version"
$assetName = "DevEnv.Manager_${Version}_x64-setup.exe"
$releaseAssets = Join-Path $root "release-assets"
$assetPath = Join-Path $releaseAssets $assetName
$notesPath = Join-Path $releaseAssets "release-notes-$tag.md"
$manifestPath = Join-Path $root "update-manifest.json"
$manifestCnPath = Join-Path $root "update-manifest.cn.json"

Set-Location $root

Invoke-Step "Check clean worktree" { Assert-CleanWorktree }
Invoke-Step "Update main from GitHub" {
  git checkout main
  git pull --ff-only origin main
}
Invoke-Step "Sync Gitee main and tags" {
  git push gitee main
  git fetch origin --tags
  git push gitee --tags
}

if (!$SkipBuild) {
  Invoke-Step "Install frontend dependencies" {
    Set-Location (Join-Path $root "tauri")
    npm ci
    Set-Location $root
  }
  Invoke-Step "Build frontend" {
    Set-Location (Join-Path $root "tauri")
    npm run build
    Set-Location $root
  }
  Invoke-Step "Build Tauri installer" {
    Set-Location (Join-Path $root "tauri")
    npm run tauri:build
    Set-Location $root
  }
}

Invoke-Step "Collect installer" {
  New-Item -ItemType Directory -Force -Path $releaseAssets | Out-Null
  $bundleRoot = Join-Path $root "tauri\src-tauri\target\release\bundle"
  $candidate = Get-ChildItem -LiteralPath $bundleRoot -Recurse -Filter "*.exe" |
    Where-Object { $_.Name -match "setup|installer|DevEnv|Manager|dailytools" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$candidate) {
    throw "No installer exe found under $bundleRoot"
  }
  Copy-Item -LiteralPath $candidate.FullName -Destination $assetPath -Force
}

$sha256 = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $assetPath).Length

$notesText = @(
  "DevEnv Manager $Version"
  ""
  "- #93 文件默认打开方式管理器：常见文件类型识别、计划预览、备份、受保护项跳转系统设置和回滚入口。"
  "- #94 双平台发布与国内多源更新：manifest v2、Gitee/GitHub mirrors、下载 fallback 和 SHA256 校验。"
  ""
  "SHA256:"
  $sha256
) -join [Environment]::NewLine
$notesText | Set-Content -LiteralPath $notesPath -Encoding UTF8

Invoke-Step "Create tag when missing" {
  $existingTag = git tag --list $tag
  if ([string]::IsNullOrWhiteSpace($existingTag)) {
    git tag -a $tag -m "Release DevEnv Manager $Version"
  }
  git push origin $tag
  git push gitee $tag
}

$githubUrl = "https://github.com/weidonglang/DevEnv-Manager/releases/download/$tag/$assetName"
$giteeUrl = "https://gitee.com/weidonglang/DevEnv-Manager/releases/download/$tag/$assetName"

$manifest = [ordered]@{
  schemaVersion = 2
  channel = "stable"
  version = $Version
  date = (Get-Date -Format "yyyy-MM-dd")
  notes = @(("v{0}: add File Association Manager and GitHub/Gitee multi-source update fallback." -f $Version))
  assets = @(
    [ordered]@{
      platform = "windows-x64"
      fileName = $assetName
      size = $size
      sha256 = $sha256
      primaryUrl = $giteeUrl
      mirrors = @(
        [ordered]@{ name = "Gitee Release"; region = "cn"; url = $giteeUrl },
        [ordered]@{ name = "GitHub Release"; region = "global"; url = $githubUrl }
      )
    }
  )
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestCnPath -Encoding UTF8

if (!$SkipGithubRelease) {
  Invoke-Step "Create GitHub Release" {
    gh release create $tag $assetPath --repo weidonglang/DevEnv-Manager --title "DevEnv Manager $Version" --notes-file $notesPath --verify-tag
  }
}

if (!$SkipGiteeRelease) {
  Invoke-Step "Create Gitee Release" {
    & (Join-Path $PSScriptRoot "publish_gitee_release.ps1") -Tag $tag -Title "DevEnv Manager $Version" -NotesFile $notesPath -AssetPath $assetPath -Sha256 $sha256
  }
}

Write-Host ""
Write-Host "Release prepared:"
Write-Host "GitHub: $githubUrl"
Write-Host "Gitee:  $giteeUrl"
Write-Host "SHA256: $sha256"
