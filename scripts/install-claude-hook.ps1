param(
  [string]$SettingsPath = "$HOME\.claude\settings.local.json"
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Command = "cd `"$ProjectRoot`"; npm run bridge:hook -- session-start"

Write-Host "Claude Code Desktop Pet hook command:"
Write-Host $Command
Write-Host ""
Write-Host "Add this command to a Claude Code SessionStart hook in: $SettingsPath"
Write-Host "This script prints the command only; it does not overwrite settings files."
