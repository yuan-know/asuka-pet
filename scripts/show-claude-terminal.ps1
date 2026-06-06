<#
.SYNOPSIS
  Activate the Claude Code terminal window.
.DESCRIPTION
  Uses Win32 API via PowerShell to find any window whose title matches
  "claude" (case-insensitive) and bring it to the foreground. If the
  window is minimized, it is restored first.
#>

Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
'@

Get-Process | Where-Object { $_.MainWindowTitle -match 'claude|Claude' } | ForEach-Object {
  $h = $_.MainWindowHandle
  if ([Win32]::IsIconic($h)) { [Win32]::ShowWindowAsync($h, 9) }  # SW_RESTORE
  [Win32]::SetForegroundWindow($h) | Out-Null
}
