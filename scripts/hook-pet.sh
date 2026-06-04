#!/bin/bash
set +e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR" || exit 0

PIDFILE="/tmp/desktop-pet.pid"
SESSION_FILE="$PROJECT_DIR/events/claude-session.json"
HOOK_NAME="${1:-SessionStart}"

now_iso() {
  powershell.exe -NoProfile -Command "Get-Date -AsUTC -Format o" 2>/dev/null | tr -d '\r'
}

is_pet_pid_alive() {
  local pid="$1"
  if [ -z "$pid" ]; then
    return 1
  fi
  powershell.exe -NoProfile -Command \
    "$p = Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\" -ErrorAction SilentlyContinue; if ($p -and $p.CommandLine -like '*claude-code-desktop-pet*') { exit 0 } exit 1" \
    >/dev/null 2>&1
}

find_claude_pid() {
  local parent_pid="$PPID"
  powershell.exe -NoProfile -Command \
    "$pid = $parent_pid; while ($pid) { $p = Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\" -ErrorAction SilentlyContinue; if (-not $p) { break }; if ($p.Name -ieq 'claude.exe' -or $p.CommandLine -like '*claude*') { Write-Output $p.ProcessId; exit 0 }; $pid = $p.ParentProcessId }" \
    2>/dev/null | tr -d '\r' | head -n 1
}

write_session_file() {
  local claude_pid="$1"
  if [ -z "$claude_pid" ]; then
    return 0
  fi
  mkdir -p "$(dirname "$SESSION_FILE")"
  local timestamp
  timestamp="$(now_iso)"
  cat > "$SESSION_FILE" <<EOF
{
  "claudePid": $claude_pid,
  "startedAt": "$timestamp",
  "updatedAt": "$timestamp"
}
EOF
}

ensure_pet_running() {
  local current_pid=""
  if [ -f "$PIDFILE" ]; then
    current_pid="$(cat "$PIDFILE" 2>/dev/null)"
  fi

  if is_pet_pid_alive "$current_pid"; then
    return 0
  fi

  rm -f "$PIDFILE"
  nohup node_modules/.bin/electron dist/main/main.js --no-sandbox --disable-gpu \
    > /dev/null 2>&1 &
  echo $! > "$PIDFILE"
  disown 2>/dev/null
}

CLAUDE_PID="$(find_claude_pid)"
write_session_file "$CLAUDE_PID"
ensure_pet_running

node node_modules/tsx/dist/cli.mjs src/bridge/claudeHook.ts "$HOOK_NAME"
exit 0
