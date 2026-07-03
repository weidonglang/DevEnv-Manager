param(
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$NotesFile,
  [Parameter(Mandatory=$true)][string]$AssetPath,
  [Parameter(Mandatory=$true)][string]$Sha256
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:GITEE_TOKEN)) {
  throw "GITEE_TOKEN is empty"
}
if ([string]::IsNullOrWhiteSpace($env:GITEE_OWNER)) {
  throw "GITEE_OWNER is empty"
}
if ([string]::IsNullOrWhiteSpace($env:GITEE_REPO)) {
  throw "GITEE_REPO is empty"
}
if (!(Test-Path -LiteralPath $NotesFile)) {
  throw "Notes file not found: $NotesFile"
}
if (!(Test-Path -LiteralPath $AssetPath)) {
  throw "Asset not found: $AssetPath"
}

$actualSha = (Get-FileHash -LiteralPath $AssetPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha -ne $Sha256.ToLowerInvariant()) {
  throw "Asset SHA256 mismatch. Expected $Sha256, actual $actualSha"
}

$owner = $env:GITEE_OWNER
$repo = $env:GITEE_REPO
$api = "https://gitee.com/api/v5"

$user = Invoke-RestMethod -Uri "$api/user" -Method Get -Body @{ access_token = $env:GITEE_TOKEN }
"Gitee API token ok. Authenticated as: $($user.login)"

git ls-remote --tags gitee "refs/tags/$Tag" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Failed to query Gitee tags. Confirm remote 'gitee' is configured."
}
$tagRef = git ls-remote --tags gitee "refs/tags/$Tag"
if ([string]::IsNullOrWhiteSpace($tagRef)) {
  throw "Tag $Tag is not pushed to Gitee"
}

$existing = $null
try {
  $existing = Invoke-RestMethod -Uri "$api/repos/$owner/$repo/releases/tags/$Tag" -Method Get -Body @{ access_token = $env:GITEE_TOKEN }
} catch {
  $existing = $null
}
if ($existing -and $existing.id) {
  throw "Gitee Release for $Tag already exists. Delete it manually or publish a new tag; this script will not overwrite silently."
}

$notes = Get-Content -LiteralPath $NotesFile -Raw
$prerelease = "false"
if ($Tag -match "-qa\.") {
  $prerelease = "true"
}
$release = Invoke-RestMethod -Uri "$api/repos/$owner/$repo/releases" -Method Post -Body @{
  access_token = $env:GITEE_TOKEN
  tag_name = $Tag
  name = $Title
  body = $notes
  prerelease = $prerelease
}

if (!$release.id) {
  throw "Gitee Release create did not return an id"
}

try {
  $assetItem = Get-Item -LiteralPath $AssetPath
  $upload = Invoke-RestMethod -Uri "$api/repos/$owner/$repo/releases/$($release.id)/attach_files" -Method Post -Form @{
    access_token = $env:GITEE_TOKEN
    file = $assetItem
  }
  if (!$upload) {
    throw "empty upload response"
  }
} catch {
  throw "Gitee Release was created, but asset upload failed. Upload $AssetPath manually to $($release.html_url). Error: $($_.Exception.Message)"
}

"Gitee Release URL: $($release.html_url)"
"Asset: $(Split-Path -Leaf $AssetPath)"
"SHA256: $actualSha"
