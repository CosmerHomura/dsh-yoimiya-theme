# Detect the desktop music players this theme can hand off to.
#
# Registry first: the uninstall keys are authoritative and survive custom
# install locations. Well-known paths are the fallback for portable installs.
#
# This file is deliberately ASCII-only. Windows PowerShell 5.1 reads a
# BOM-less UTF-8 script as ANSI, so Chinese literals here would arrive mangled
# and the registry match would silently fail. Matching uses the ASCII parts of
# the product names instead; the display names live on the browser side.
#
# Output: one line of JSON on stdout.
#   {"ok":true,"players":[{"id":"netease","exe":"...","running":false,"source":"registry"}]}

param()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

$pf86 = ${env:ProgramFiles(x86)}
$pf = $env:ProgramFiles
$lad = $env:LOCALAPPDATA

# id is stable and used in URLs; exe name is used for the running check.
$targets = @(
  @{
    id = 'netease'
    proc = 'cloudmusic'
    match = 'CloudMusic|Netease'
    paths = @(
      (Join-Path $lad 'Netease\CloudMusic\cloudmusic.exe'),
      (Join-Path $pf86 'Netease\CloudMusic\cloudmusic.exe'),
      (Join-Path $pf 'Netease\CloudMusic\cloudmusic.exe')
    )
  },
  @{
    id = 'qqmusic'
    proc = 'QQMusic'
    match = 'QQMusic'
    paths = @(
      (Join-Path $pf86 'Tencent\QQMusic\QQMusic.exe'),
      (Join-Path $pf 'Tencent\QQMusic\QQMusic.exe'),
      (Join-Path $lad 'Tencent\QQMusic\QQMusic.exe')
    )
  }
)

# Collect uninstall entries once; DisplayIcon is usually the main executable
# and may carry a trailing icon index (",0") that has to be stripped.
$entries = @()
foreach ($root in @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)) {
  $entries += Get-ItemProperty $root
}

$players = @()
foreach ($t in $targets) {
  $exe = $null
  $source = $null

  foreach ($e in $entries) {
    # Match on the PATH fields (DisplayIcon / InstallLocation / UninstallString)
    # rather than DisplayName. The product name is localized (Chinese) while the
    # paths keep the ASCII product name ("CloudMusic"), and this file has to stay
    # ASCII-only. Matching DisplayName alone silently missed a perfectly good
    # install at E:\life\CloudMusic because the name was Chinese.
    $hay = ([string]$e.DisplayIcon) + ' ' + ([string]$e.InstallLocation) + ' ' + ([string]$e.UninstallString)
    if ($hay -notmatch $t.match) { continue }
    $icon = [string]$e.DisplayIcon
    if ($icon.Length -gt 0) {
      $candidate = ($icon -split ',')[0].Trim().Trim('"')
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $exe = $candidate
        $source = 'registry'
        break
      }
    }
    $loc = [string]$e.InstallLocation
    if ($loc.Length -gt 0 -and (Test-Path -LiteralPath $loc)) {
      $found = Get-ChildItem -LiteralPath $loc -Filter '*.exe' |
        Where-Object { $_.BaseName -match $t.match } |
        Select-Object -First 1
      if ($found) {
        $exe = $found.FullName
        $source = 'registry'
        break
      }
    }
  }

  if (-not $exe) {
    foreach ($p in $t.paths) {
      if (Test-Path -LiteralPath $p) {
        $exe = $p
        $source = 'path'
        break
      }
    }
  }

  if ($exe) {
    $running = @(Get-Process -Name $t.proc).Count -gt 0
    $players += [pscustomobject]@{
      id = $t.id
      exe = $exe
      running = $running
      source = $source
    }
  }
}

[pscustomobject]@{ ok = $true; players = $players } | ConvertTo-Json -Compress -Depth 4
