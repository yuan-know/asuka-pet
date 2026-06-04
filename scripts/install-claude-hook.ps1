param(
  [string]$SettingsPath = "$HOME\.claude\settings.json",
  [switch]$PrintOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$HookScript = Join-Path $ProjectRoot "scripts\hook-pet.sh"
$BashCommand = "bash `"$HookScript`" `$CLAUDE_HOOK_EVENT_NAME"

function New-HookEntry([string]$Command) {
  return @{
    matcher = ""
    hooks = @(
      @{
        type = "command"
        command = $Command
        timeout = 10
      }
    )
  }
}

$hookEvents = @("SessionStart", "PreToolUse", "PostToolUse", "Stop")

if (-not (Test-Path $SettingsPath)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $SettingsPath) | Out-Null
  $settings = New-Object PSObject -Property @{}
} else {
  $raw = Get-Content -Raw $SettingsPath
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $settings = New-Object PSObject -Property @{}
  } else {
    $settings = $raw | ConvertFrom-Json
  }
}

# Ensure hooks property exists
if (-not ($settings.PSObject.Properties.Name -contains 'hooks') -or $null -eq $settings.hooks) {
  $settings | Add-Member -MemberType NoteProperty -Name 'hooks' -Value (New-Object PSObject) -Force
}

foreach ($eventName in $hookEvents) {
  $entry = New-HookEntry $BashCommand
  $settings.hooks | Add-Member -MemberType NoteProperty -Name $eventName -Value @($entry) -Force
}

$json = $settings | ConvertTo-Json -Depth 20

if ($PrintOnly) {
  Write-Output $json
  exit 0
}

# Backup existing settings
$backupPath = "$SettingsPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path $SettingsPath -Destination $backupPath -Force
Write-Host "Backed up existing settings to: $backupPath"

Set-Content -Path $SettingsPath -Value $json -Encoding UTF8
Write-Host "Installed Claude Code Desktop Pet hooks in $SettingsPath"
Write-Host "Restart Claude Code for SessionStart hook to take effect."
