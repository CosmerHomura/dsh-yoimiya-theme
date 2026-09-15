# ============================================================================
#  dsh-yoimiya-theme - local installer for DSH Desktop (Windows)
#
#  USAGE
#    Right-click this file -> "Run with PowerShell"
#    or:  powershell -ExecutionPolicy Bypass -File "<path to this file>"
#
#  WHAT IT DOES
#    1. Waits until DSH Desktop is fully closed. The install rewrites the
#       profile's node_modules, which is unsafe while DSH is reading it.
#       A PowerShell window is independent of DSH, so quitting DSH does NOT
#       close this window - come back here and press Enter.
#    2. Backs up the profile package.json and pnpm-lock.yaml.
#    3. Links the theme into <profile>\vendor\ and runs
#         pnpm add "file:./vendor/dsh-yoimiya-theme"
#    4. Verifies the dependency is registered, the package resolves, and it
#       declares dsh.bundle.patch with both halves present.
#    5. If pnpm itself fails, restores package.json and pnpm-lock.yaml from the
#       backups and removes the half-linked node_modules entry, so a failed run
#       leaves nothing behind. Once pnpm SUCCEEDS the manifest is never rolled
#       back - doing that would orphan node_modules and end up worse than the
#       verification failure that triggered it.
#
#  WHY A RELATIVE SPEC
#    pnpm joins a `file:` spec onto the profile directory instead of treating it
#    as absolute - path.join does not honour a Windows drive letter in its second
#    argument. Passing the theme folder directly produced:
#      ENOENT scandir 'C:\...\profiles\web\F:\<theme folder>'
#    A relative spec cannot be misread, but it must stay on the same drive as the
#    profile (C:), while a repo commonly lives on another drive (D:, E:, F:...).
#    A directory junction inside the profile bridges the two, and unlike a
#    symlink it needs no administrator rights.
#
#  TWO POWERSHELL TRAPS THIS FILE WORKS AROUND
#    1. This file is ASCII-only on purpose. Windows PowerShell 5.1 reads a
#       BOM-less UTF-8 script as ANSI, so non-ASCII text here would arrive
#       mangled and a hard-coded non-ASCII path would break. The theme folder is
#       derived from this script's own location instead.
#    2. Every JSON file is read through [System.IO.File]::ReadAllText with an
#       explicit UTF-8 encoding. Get-Content -Raw uses the ANSI code page for
#       BOM-less UTF-8 files, which turns the theme's Chinese description into
#       mojibake, breaks its quotes, and makes ConvertFrom-Json throw:
#         Invalid object passed in, ':' or '}' expected
#       The theme's package.json is stored without a BOM, so this path is always
#       taken.
# ============================================================================

param(
  # Skip every prompt and fail fast instead of waiting. For automated checks.
  [switch]$Unattended
)

$ErrorActionPreference = 'Stop'

$logPath = Join-Path $env:TEMP ('dsh-yoimiya-install-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

function Log($m) {
  Write-Host $m
  try { Add-Content -LiteralPath $logPath -Value $m -ErrorAction SilentlyContinue } catch { }
}
function Ok($m)   { Log ('  [ok]   ' + $m) }
function Step($m) { Log ''; Log $m }
function Die($m)  { throw $m }

# Read JSON as UTF-8 regardless of BOM. Get-Content would use the ANSI code page
# for the theme's BOM-less package.json and break on its Chinese text.
function Read-Json($path) {
  return ([System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) | ConvertFrom-Json)
}

$theme   = Split-Path -Parent $PSScriptRoot
$harness = Join-Path $env:APPDATA 'dsh-desktop\harness'
$prof    = Join-Path $harness 'profiles\web'
$pnpm    = Join-Path $harness '.desktop-bin\pnpm.cmd'
$pkgName = 'dsh-yoimiya-theme'
$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$backedUp  = $false
$installed = $false
$failure   = $null

function Get-DshProcesses {
  @(Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -like '*DSH*' -or $_.ProcessName -like '*harness*' })
}

function WaitForDshClosed {
  while ($true) {
    $procs = Get-DshProcesses
    if ($procs.Count -eq 0) { return }
    $names = ($procs | ForEach-Object { $_.ProcessName + '(' + $_.Id + ')' }) -join ', '
    if ($Unattended) { Die ('DSH Desktop is still running: ' + $names) }
    Log ''
    Log ('  DSH Desktop is still running: ' + $names)
    Log '  The install rewrites the profile node_modules, so DSH must be closed.'
    Log '  Quit DSH Desktop completely (tray icon -> Quit), then press Enter here.'
    Log '  This window belongs to PowerShell, not to DSH, and stays open.'
    Read-Host '  press Enter to continue' | Out-Null
  }
}

function Restore-Backups {
  foreach ($f in @('package.json', 'pnpm-lock.yaml')) {
    $bak = Join-Path $prof ($f + '.bak-' + $stamp)
    if (Test-Path $bak) {
      Copy-Item $bak (Join-Path $prof $f) -Force
      Log ('  restored ' + $f + ' from the backup taken before this run')
    }
  }
  # pnpm may have left a half-linked entry behind; drop it so a re-run starts clean.
  $entry = Join-Path $prof ('node_modules\' + $pkgName)
  if (Test-Path $entry) {
    Remove-Item $entry -Recurse -Force -ErrorAction SilentlyContinue
    Log ('  removed the half-linked ' + $entry)
  }
}

try {
  Log ''
  Log 'dsh-yoimiya-theme - local installer'
  Log ('-' * 58)

  # ---- 1. preflight --------------------------------------------------------
  Step '1/4  Preflight'

  if (-not (Test-Path (Join-Path $theme 'package.json'))) {
    Die ('Theme root not found. Keep this script inside the theme tools folder. Looked in: ' + $theme)
  }
  Ok ('theme root: ' + $theme)

  if (-not (Test-Path $pnpm)) {
    Die ('pnpm not found at ' + $pnpm + ' - is DSH Desktop installed for this user?')
  }
  Ok ('pnpm: ' + $pnpm)

  if (-not (Test-Path (Join-Path $prof 'package.json'))) {
    Die ('Profile not found: ' + $prof)
  }
  Ok ('profile: ' + $prof)

  WaitForDshClosed
  Ok 'no DSH process running'

  # Warn about debris from a previous failed run, which would otherwise be
  # backed up as if it were the good state.
  $manifestNow = Read-Json (Join-Path $prof 'package.json')
  $declaredNow = $manifestNow.dependencies.$pkgName
  $resolvesNow = Test-Path (Join-Path $prof ('node_modules\' + $pkgName))
  if (($null -ne $declaredNow) -and (-not $resolvesNow)) {
    Log ''
    Log ('  [warn] ' + $pkgName + ' is declared in the profile package.json but')
    Log '         does not resolve in node_modules - a previous run failed.'
    Log '         Restore the manifest from its newest .bak-* file first, or this'
    Log '         run will back up the broken state as if it were good.'
    if (-not $Unattended) {
      Read-Host '  press Enter to continue anyway, or Ctrl+C to stop and restore' | Out-Null
    }
  }

  # ---- 2. backup -----------------------------------------------------------
  Step '2/4  Backup'

  foreach ($f in @('package.json', 'pnpm-lock.yaml')) {
    $src = Join-Path $prof $f
    if (Test-Path $src) {
      Copy-Item $src ($src + '.bak-' + $stamp) -Force
      Ok ('backed up ' + $f + '  ->  ' + $f + '.bak-' + $stamp)
    }
  }
  $backedUp = $true

  # ---- 3. install ----------------------------------------------------------
  Step '3/4  Install'

  $vendor = Join-Path $prof 'vendor'
  if (-not (Test-Path $vendor)) { New-Item -ItemType Directory -Path $vendor -Force | Out-Null }
  $vendorLink = Join-Path $vendor $pkgName
  if (Test-Path $vendorLink) { Remove-Item $vendorLink -Recurse -Force -ErrorAction SilentlyContinue }
  New-Item -ItemType Junction -Path $vendorLink -Target $theme | Out-Null
  Ok ('junction: ' + $vendorLink + '  ->  ' + $theme)

  # Start from a clean slate for this package: a previous attempt may have
  # left a half-linked entry behind, which would make the checks below pass
  # for the wrong reason.
  $entry = Join-Path $prof ('node_modules\' + $pkgName)
  if (Test-Path $entry) {
    Remove-Item $entry -Recurse -Force -ErrorAction SilentlyContinue
    Log ('  removed the leftover ' + $entry)
  }

  $spec = './vendor/' + $pkgName
  Log ('  running: pnpm add "file:' + $spec + '"')
  & $pnpm --dir $prof add ('file:' + $spec)
  if ($LASTEXITCODE -ne 0) { Die ('pnpm exited with ' + $LASTEXITCODE) }
  $installed = $true

  # ---- 4. verify -----------------------------------------------------------
  Step '4/4  Verify'

  $manifest = Read-Json (Join-Path $prof 'package.json')
  $dep = $manifest.dependencies.$pkgName
  if ($null -eq $dep) { Die ('dependencies.' + $pkgName + ' missing from the profile package.json') }
  Ok ('profile dependencies: ' + $pkgName + ' = ' + $dep)

  $link = Join-Path $prof ('node_modules\' + $pkgName)
  if (-not (Test-Path $link)) { Die ('node_modules\' + $pkgName + ' was not created - DSH will not resolve the bundle') }

  $innerPath = Join-Path $link 'package.json'
  if (-not (Test-Path $innerPath)) { Die ('cannot read node_modules\' + $pkgName + '\package.json') }
  $inner = Read-Json $innerPath
  if ($inner.dsh.bundle.patch -ne './cordis.patch.yml') {
    Die 'the package does not declare dsh.bundle.patch - DSH will not treat it as a bundle'
  }
  Ok 'resolvable, and declares dsh.bundle.patch'

  foreach ($f in @('bundle\host.js', 'bundle\client.js', 'cordis.patch.yml')) {
    if (-not (Test-Path (Join-Path $link $f))) { Die ('missing file in the installed package: ' + $f) }
  }
  Ok 'host half, client half and cordis patch all present'

  Log ''
  Log ('-' * 58)
  Log '  INSTALLED'
  Log ''
  Log '  Next:'
  Log '    1. Start DSH Desktop, then reload the page.'
  Log ('    2. On startup DSH writes ' + $pkgName + ' into dsh.profile.bundles')
  Log '       by itself - do not edit that list by hand.'
  Log '    3. If the theme is applied, the install worked. Host-side console'
  Log '       output is not visible in the GUI; if you need it, the plugin'
  Log '       market settings page can export a redacted log.'
  Log ''
  Log ('  Rollback: & "' + $pnpm + '" --dir "' + $prof + '" remove ' + $pkgName)
}
catch {
  $failure = $_
  # Only undo when pnpm did NOT succeed. Once it has, the manifest and
  # node_modules agree with each other, and restoring the manifest alone would
  # leave an orphaned entry - worse than the failure being reported.
  if ($backedUp -and (-not $installed)) {
    Log ''
    Log '  rolling back: pnpm did not complete, restoring the profile manifest'
    try { Restore-Backups } catch { Log ('  rollback itself failed: ' + $_.Exception.Message) }
  } elseif ($installed) {
    Log ''
    Log '  note: pnpm already completed, so the manifest is left as installed.'
    Log '        The failure above is in verification, not in the install.'
  }
}

# ---- always stop here so the window cannot close unread --------------------
Log ''
Log ('log file: ' + $logPath)
if ($null -ne $failure) {
  Log ''
  Log ('[FAILED] ' + $failure.Exception.Message)
  if ($backedUp -and (-not $installed)) {
    Log 'package.json and pnpm-lock.yaml were restored from the backups taken'
    Log 'earlier in this run, so the profile is back to how it started.'
  }
} else {
  Log ''
  Log 'Done.'
}
if (-not $Unattended) {
  Log ''
  try { Read-Host 'Press Enter to close this window' | Out-Null } catch { }
}

if ($null -ne $failure) { exit 1 }
