#!/bin/bash
set +e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR_WIN="$(echo "$PROJECT_DIR" | sed 's|^/c/|C:/|' | sed 's|/|\\\\|g')"
cd "$PROJECT_DIR" || exit 0

PIDFILE="/tmp/desktop-pet.pid"
SESSION_FILE="$PROJECT_DIR/events/claude-session.json"
HOOK_NAME="${1:-SessionStart}"

now_iso() {
  powershell.exe -NoProfile -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffK'" 2>/dev/null | tr -d '\r'
}

is_pet_pid_alive() {
  local pid="$1"
  if [ -z "$pid" ]; then return 1; fi
  powershell.exe -NoProfile -Command \
    "\$p = Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\" -ErrorAction SilentlyContinue; if (\$p) { exit 0 } exit 1" \
    >/dev/null 2>&1
}

find_claude_pid() {
  powershell.exe -NoProfile -Command \
    "Get-CimInstance Win32_Process -Filter \"Name='claude.exe'\" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessId" \
    2>/dev/null | tr -d '\r' | head -n 1
}

write_session_file() {
  local claude_pid="${1:-0}"
  [ -z "$claude_pid" ] && claude_pid=0
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

  # 启动前记录已有 electron.exe 的 PID
  local before_pids
  before_pids="$(
    powershell.exe -NoProfile -Command \
      "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessId" \
      2>/dev/null | tr -d '\r'
  )"

  rm -f "$PIDFILE"
  powershell.exe -NoProfile -Command \
    "Start-Process -FilePath 'node_modules/.bin/electron.cmd' -ArgumentList 'dist/main/main.js','--no-sandbox','--disable-gpu' -WorkingDirectory '$PROJECT_DIR_WIN' -WindowStyle Hidden"

  # 等待 electron.exe 启动后，找新出现的主进程（CommandLine 不含 --type=）
  sleep 2
  local real_pid
  real_pid="$(
    powershell.exe -NoProfile -Command \
      "\$before = @($(echo "$before_pids" | awk '{printf "%s,", $1}' | sed 's/,$//')); Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" -ErrorAction SilentlyContinue | Where-Object { \$_.CommandLine -notlike '*--type=*' -and \$before -notcontains \$_.ProcessId } | Select-Object -First 1 -ExpandProperty ProcessId" \
      2>/dev/null | tr -d '\r' | head -n 1
  )"

  if [ -n "$real_pid" ]; then
    echo "$real_pid" > "$PIDFILE"
  fi
}

stop_pet() {
  # 先检查 claude.exe 是否还在运行
  local claude_pid
  claude_pid="$(find_claude_pid)"
  if [ -n "$claude_pid" ]; then
    return 0
  fi

  local pid
  if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE" 2>/dev/null)"
    if [ -n "$pid" ]; then
      powershell.exe -NoProfile -Command "Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue" >/dev/null 2>&1
    fi
    rm -f "$PIDFILE"
  fi
}

if [ "${1:-}" = "stop" ]; then
  stop_pet
  exit 0
fi

CLAUDE_PID="$(find_claude_pid)"
write_session_file "$CLAUDE_PID"
ensure_pet_running

cat | node node_modules/tsx/dist/cli.mjs src/bridge/claudeHook.ts "$HOOK_NAME"
exit 0
