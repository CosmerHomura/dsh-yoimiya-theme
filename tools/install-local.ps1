# ============================================================================
#  dsh-yoimiya-theme - local installer for DSH Desktop (Windows)
#
#  USAGE
#    1. Fully quit DSH Desktop (tray icon -> quit; make sure no process left)
#    2. Right-click this file -> "Run with PowerShell"
#       or in a terminal:
#         powershell -ExecutionPolicy Bypass -File "<path to this file>"
#
#  WHY THE APP MUST BE CLOSED
#    pnpm rewrites the profile's node_modules. While the app is running those
#    files are locked, and the app may read a half-replaced package.
#
#  WHY NOT THE `dsh` CLI
#    DSH Desktop ships no `dsh` command; only node/pnpm under .desktop-bin.
#
#  WHY THIS INSTALL IS RECOGNISED BY DESKTOP
#    Desktop's projection does `const dependencies = { ...currentDeps }`
#    ("Real profile dependencies carry through unchanged"), and on startup it
#    auto-adds any dependency that declares `dsh.bundle.patch` into
#    `dsh.profile.bundles`. So the bundles list is never hand-edited.
#
#  NOTE: this file is intentionally ASCII-only. Windows PowerShell 5.1 reads
#  BOM-less UTF-8 as ANSI, so non-ASCII text here would arrive mangled. The
#  theme directory is derived from this script's own location instead.
# ============================================================================

$ErrorActionPreference = 'Stop'

$theme   = Split-Path -Parent $PSScriptRoot          # ...\<theme root>\
$harness = Join-Path $env:APPDATA 'dsh-desktop\harness'
$prof    = Join-Path $harness 'profiles\web'
$pnpm    = Join-Path $harness '.desktop-bin\pnpm.cmd'
$pkgName = 'dsh-yoimiya-theme'

function Say($m)  { Write-Host $m }
function Ok($m)   { Write-Host "  [ok] $m" -ForegroundColor Green }
function Step($m) { Write-Host ""; Write-Host $m -ForegroundColor Cyan }
function Die($m)  { Write-Host ""; Write-Host "  [FAIL] $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "dsh-yoimiya-theme - local installer" -ForegroundColor White
Write-Host ("-" * 58)

# ---- 0. preflight ----------------------------------------------------------
Step "1/4  Preflight"

if (-not (Test-Path (Join-Path $theme 'package.json'))) {
  Die "Theme root not found. This script must stay inside the theme's tools\ folder. Expected: $theme"
}
Ok "theme root: $theme"

if (-not (Test-Path $pnpm)) {
  Die "pnpm not found at $pnpm - is DSH Desktop installed for this user?"
}
Ok "pnpm: $pnpm"

if (-not (Test-Path (Join-Path $prof 'package.json'))) {
  Die "Profile not found: $prof"
}
Ok "profile: $prof"

$running = @(Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -like '*dsh*' -or $_.ProcessName -like '*harness*' })
if ($running.Count -gt 0) {
  $names = ($running | ForEach-Object { "$($_.ProcessName)($($_.Id))" }) -join ', '
  Die "DSH is still running: $names`n       Quit it completely, then run this script again."
}
Ok "no DSH process running"

# ---- 1. backup -------------------------------------------------------------
Step "2/4  Backup"

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($f in @('package.json', 'pnpm-lock.yaml')) {
  $src = Join-Path $prof $f
  if (Test-Path $src) {
    Copy-Item $src "$src.bak-$stamp" -Force
    Ok "backed up $f  ->  $f.bak-$stamp"
  }
}

# ---- 2. install ------------------------------------------------------------
Step "3/4  Install"

Say "  running: pnpm add `"file:$theme`""
& $pnpm --dir $prof add "file:$theme"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  pnpm exited with $LASTEXITCODE" -ForegroundColor Red
  Write-Host "  To roll back:"
  Write-Host "    Copy-Item `"$prof\package.json.bak-$stamp`" `"$prof\package.json`" -Force"
  Write-Host "    Copy-Item `"$prof\pnpm-lock.yaml.bak-$stamp`" `"$prof\pnpm-lock.yaml`" -Force"
  exit 1
}

# ---- 3. verify -------------------------------------------------------------
Step "4/4  Verify"

$manifest = Get-Content (Join-Path $prof 'package.json') -Raw | ConvertFrom-Json
$dep = $manifest.dependencies.$pkgName
if ($null -eq $dep) { Die "dependencies.$pkgName missing from profile package.json" }
Ok "profile dependencies: $pkgName = $dep"

$link = Join-Path $prof "node_modules\$pkgName"
if (-not (Test-Path $link)) { Die "node_modules\$pkgName was not created - desktop will not resolve the bundle" }

$innerPath = Join-Path $link 'package.json'
if (-not (Test-Path $innerPath)) { Die "cannot read node_modules\$pkgName\package.json" }
$inner = Get-Content $innerPath -Raw | ConvertFrom-Json
if ($inner.dsh.bundle.patch -ne './cordis.patch.yml') {
  Die "package does not declare dsh.bundle.patch - desktop will not treat it as a bundle"
}
Ok "resolvable, and declares dsh.bundle.patch"

foreach ($f in @('bundle\host.js', 'bundle\client.js', 'cordis.patch.yml')) {
  if (-not (Test-Path (Join-Path $link $f))) { Die "missing file in installed package: $f" }
}
Ok "host half, client half and cordis patch all present"

# ---- done ------------------------------------------------------------------
Write-Host ""
Write-Host ("-" * 58)
Write-Host "  INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "  Next:"
Write-Host "    1. Start DSH Desktop."
Write-Host "    2. On startup the projection writes $pkgName into"
Write-Host "       dsh.profile.bundles automatically - do not edit it by hand."
Write-Host "    3. After the GUI is up, reload the page. The host log should show:"
Write-Host "         [yoimiya-theme] host half ready (4/4 asset routes)"
Write-Host ""
Write-Host "  Editing the theme later: just edit $theme and reload the page."
Write-Host "  No reinstall needed, because this is a file: link."
Write-Host ""
Write-Host "  Rollback:"
Write-Host "    & `"$pnpm`" --dir `"$prof`" remove $pkgName"
Write-Host ""
