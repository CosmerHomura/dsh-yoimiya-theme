# Read and control the Windows system media session (GSMTC).
#
# Any player that registers a media session works - NetEase Cloud Music,
# Spotify, Edge, the system player. No player-specific API or unofficial
# server is involved, so nothing breaks when a player updates.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File media.ps1 -Action status
#   ... -Action toggle | next | prev
#
# Output: exactly one line of JSON on stdout. A non-ok body means "no player",
# not an error - the caller hides the control in that case.

param([string]$Action = 'status')

# PowerShell 5.1 writes stdout in the OEM code page by default, which mangles
# Chinese track titles. Force UTF-8 before anything else is printed.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'

function Write-Result($ok, $reason, $title, $artist, $app, $status) {
  [pscustomobject]@{
    ok     = $ok
    reason = $reason
    title  = $title
    artist = $artist
    app    = $app
    status = $status
  } | ConvertTo-Json -Compress
  exit 0
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
} catch {
  Write-Result $false 'no-winrt' '' '' '' ''
}

# WinRT exposes only IAsyncOperation; PowerShell has no await for it, so we
# borrow the framework's AsTask projection and block on the resulting Task.
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($operation, $resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  $task.Result
}

$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]

try {
  $manager = Await ($managerType::RequestAsync()) ($managerType)
} catch {
  Write-Result $false 'no-manager' '' '' '' ''
}

$session = $manager.GetCurrentSession()
if ($null -eq $session) {
  Write-Result $false 'no-session' '' '' '' ''
}

# A player may refuse a command (nothing queued, no next track). Treat that as
# "command did not take" and still return the current status rather than failing.
try {
  switch ($Action) {
    'toggle' { Await ($session.TryTogglePlayPauseAsync()) ([bool]) | Out-Null }
    'next'   { Await ($session.TrySkipNextAsync()) ([bool]) | Out-Null }
    'prev'   { Await ($session.TrySkipPreviousAsync()) ([bool]) | Out-Null }
  }
} catch {
  # fall through to the status report below
}

$props = Await ($session.TryGetMediaPropertiesAsync()) ($propsType)
$info = $session.GetPlaybackInfo()

Write-Result $true '' ([string]$props.Title) ([string]$props.Artist) ([string]$session.SourceAppUserModelId) ([string]$info.PlaybackStatus)
