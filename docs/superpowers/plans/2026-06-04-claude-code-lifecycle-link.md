# Claude Code Lifecycle Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop pet start with Claude Code, follow Claude Code hook state changes, and quit only when the Claude Code process that started it exits.

**Architecture:** Claude Code hooks call `scripts/hook-pet.sh`, which starts the Electron app if needed, records the Claude Code PID in a session file, and forwards hook JSON to the bridge mapper. The Electron main process polls the session file and exits when the recorded Claude Code PID no longer exists, while the existing JSONL inbox continues to drive renderer state changes.

**Tech Stack:** Electron, TypeScript, Node.js fs/child_process APIs, bash hook script, PowerShell process queries, JSON/JSONL local event files, Vitest.

---

## File Structure

- Modify `src/shared/paths.ts`: add `session` path under the existing events directory.
- Create `src/shared/session.ts`: define session file shape plus JSON read/write helpers.
- Create `src/main/processMonitor.ts`: Electron-side PID liveness check and lifecycle monitor.
- Modify `src/main/main.ts`: start/stop the lifecycle monitor with the app.
- Modify `src/bridge/claudeHook.ts`: keep Stop as waiting state, include hook details, and keep hook output non-blocking.
- Modify `scripts/hook-pet.sh`: identify pet process by pidfile/command line, start pet when missing, write session file, forward hook input.
- Modify `scripts/install-claude-hook.ps1`: install or update the active user settings hooks.
- Create `tests/session.test.ts`: test session read/write behavior.
- Create `tests/processMonitor.test.ts`: test monitor decisions with injected liveness checks.
- Modify `tests/claude-hook.test.ts`: assert hook-name normalization and Stop behavior.
- Modify `docs/handoff.md`: document current lifecycle integration status and verification commands.

---

### Task 1: Add Session File Path and Helpers

**Files:**
- Modify: `src/shared/paths.ts`
- Create: `src/shared/session.ts`
- Test: `tests/session.test.ts`

- [ ] **Step 1: Write the failing session helper tests**

Create `tests/session.test.ts` with:

```ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { getEventPaths } from '../src/shared/paths';
import { readClaudeSession, writeClaudeSession } from '../src/shared/session';

const tempDirs: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'desktop-pet-session-'));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe('Claude session file', () => {
  it('adds a session path under events', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);

    expect(paths.session).toBe(path.join(root, 'events', 'claude-session.json'));
  });

  it('writes and reads a valid Claude Code session', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);
    const session = {
      claudePid: 12345,
      startedAt: '2026-06-04T00:00:00.000Z',
      updatedAt: '2026-06-04T00:00:01.000Z'
    };

    await writeClaudeSession(paths.session, session);

    await expect(readClaudeSession(paths.session)).resolves.toEqual(session);
  });

  it('returns null for missing or malformed session files', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);

    await expect(readClaudeSession(paths.session)).resolves.toBeNull();
    await writeClaudeSession(paths.session, {
      claudePid: 0,
      startedAt: 'bad',
      updatedAt: 'bad'
    });

    await expect(readClaudeSession(paths.session)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the session tests and confirm they fail**

Run:

```bash
npm test -- tests/session.test.ts
```

Expected: FAIL because `paths.session`, `readClaudeSession`, and `writeClaudeSession` do not exist.

- [ ] **Step 3: Add the session path**

Update `src/shared/paths.ts` to include `session`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface EventPaths {
  projectRoot: string;
  eventsDir: string;
  inbox: string;
  outbox: string;
  processed: string;
  session: string;
  logsDir: string;
  bridgeLog: string;
}

export function getProjectRoot(): string {
  if (process.env.DESKTOP_PET_ROOT) {
    return path.resolve(process.env.DESKTOP_PET_ROOT);
  }

  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

export function getEventPaths(projectRoot = getProjectRoot()): EventPaths {
  const resolvedRoot = path.resolve(projectRoot);
  const eventsDir = path.join(resolvedRoot, 'events');
  const logsDir = path.join(resolvedRoot, 'logs');

  return {
    projectRoot: resolvedRoot,
    eventsDir,
    inbox: path.join(eventsDir, 'inbox.jsonl'),
    outbox: path.join(eventsDir, 'outbox.jsonl'),
    processed: path.join(eventsDir, 'processed.jsonl'),
    session: path.join(eventsDir, 'claude-session.json'),
    logsDir,
    bridgeLog: path.join(logsDir, 'bridge.log')
  };
}
```

- [ ] **Step 4: Add session helpers**

Create `src/shared/session.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ClaudeSession {
  claudePid: number;
  startedAt: string;
  updatedAt: string;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function isClaudeSession(value: unknown): value is ClaudeSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isInteger(record.claudePid) &&
    Number(record.claudePid) > 0 &&
    isIsoDate(record.startedAt) &&
    isIsoDate(record.updatedAt)
  );
}

export async function readClaudeSession(filePath: string): Promise<ClaudeSession | null> {
  let raw = '';
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') return null;
    throw error;
  }

  try {
    const parsed = JSON.parse(raw);
    return isClaudeSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeClaudeSession(filePath: string, session: ClaudeSession): Promise<void> {
  if (!isClaudeSession(session)) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}
```

- [ ] **Step 5: Run session tests and confirm they pass**

Run:

```bash
npm test -- tests/session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/shared/paths.ts src/shared/session.ts tests/session.test.ts
git commit -m "feat: add claude session file helpers"
```

---

### Task 2: Add Electron Lifecycle Monitor

**Files:**
- Create: `src/main/processMonitor.ts`
- Modify: `src/main/main.ts`
- Test: `tests/processMonitor.test.ts`

- [ ] **Step 1: Write the failing lifecycle monitor tests**

Create `tests/processMonitor.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEventPaths } from '../src/shared/paths';
import { writeClaudeSession } from '../src/shared/session';
import { checkClaudeLifecycleOnce, createClaudeLifecycleMonitor } from '../src/main/processMonitor';

const tempDirs: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'desktop-pet-monitor-'));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  vi.useRealTimers();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe('Claude lifecycle monitor', () => {
  it('keeps the pet running when there is no session file', async () => {
    const root = await makeRoot();
    const shouldQuit = await checkClaudeLifecycleOnce(root, async () => false);

    expect(shouldQuit).toBe(false);
  });

  it('keeps the pet running while the Claude PID is alive', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);
    await writeClaudeSession(paths.session, {
      claudePid: 12345,
      startedAt: '2026-06-04T00:00:00.000Z',
      updatedAt: '2026-06-04T00:00:00.000Z'
    });

    const shouldQuit = await checkClaudeLifecycleOnce(root, async (pid) => pid === 12345);

    expect(shouldQuit).toBe(false);
  });

  it('quits the pet when the Claude PID is gone', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);
    await writeClaudeSession(paths.session, {
      claudePid: 12345,
      startedAt: '2026-06-04T00:00:00.000Z',
      updatedAt: '2026-06-04T00:00:00.000Z'
    });

    const shouldQuit = await checkClaudeLifecycleOnce(root, async () => false);

    expect(shouldQuit).toBe(true);
  });

  it('starts and stops a polling monitor', () => {
    vi.useFakeTimers();
    const onQuit = vi.fn();
    const monitor = createClaudeLifecycleMonitor({
      projectRoot: 'unused',
      intervalMs: 1000,
      isProcessAlive: async () => false,
      onQuit
    });

    monitor.start();
    monitor.start();
    monitor.stop();
    monitor.stop();

    expect(onQuit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run monitor tests and confirm they fail**

Run:

```bash
npm test -- tests/processMonitor.test.ts
```

Expected: FAIL because `src/main/processMonitor.ts` does not exist.

- [ ] **Step 3: Implement the lifecycle monitor**

Create `src/main/processMonitor.ts`:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getEventPaths } from '../shared/paths';
import { readClaudeSession } from '../shared/session';

const execFileAsync = promisify(execFile);

export type ProcessAliveCheck = (pid: number) => Promise<boolean>;

export async function isProcessAlive(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id`
      ]);
      return stdout.trim() === String(pid);
    } catch {
      return false;
    }
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function checkClaudeLifecycleOnce(
  projectRoot: string | undefined,
  checkProcessAlive: ProcessAliveCheck = isProcessAlive
): Promise<boolean> {
  const paths = getEventPaths(projectRoot);
  const session = await readClaudeSession(paths.session);
  if (!session) return false;
  return !(await checkProcessAlive(session.claudePid));
}

export interface ClaudeLifecycleMonitorOptions {
  projectRoot?: string;
  intervalMs?: number;
  isProcessAlive?: ProcessAliveCheck;
  onQuit: () => void;
}

export function createClaudeLifecycleMonitor(options: ClaudeLifecycleMonitorOptions): {
  start: () => void;
  stop: () => void;
} {
  const intervalMs = options.intervalMs ?? 2000;
  const checkProcessAlive = options.isProcessAlive ?? isProcessAlive;
  let timer: NodeJS.Timeout | undefined;
  let checking = false;

  async function poll(): Promise<void> {
    if (checking) return;
    checking = true;
    try {
      const shouldQuit = await checkClaudeLifecycleOnce(options.projectRoot, checkProcessAlive);
      if (shouldQuit) options.onQuit();
    } finally {
      checking = false;
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => void poll(), intervalMs);
      void poll();
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    }
  };
}
```

- [ ] **Step 4: Wire the monitor into Electron main**

Update `src/main/main.ts` to include the monitor:

```ts
import { app, ipcMain } from 'electron';
import { MainEventBus } from './eventBus';
import { createPetTray } from './tray';
import { createPetWindow } from './window';
import { createClaudeLifecycleMonitor } from './processMonitor';
import { isDesktopPetEvent } from '../shared/eventTypes';
import { readFileContent, enrichFileMetas } from './fileReader';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  const bus = new MainEventBus();
  const lifecycleMonitor = createClaudeLifecycleMonitor({ onQuit: () => app.quit() });

  app.whenReady().then(() => {
    const window = createPetWindow();
    createPetTray(window);

    bus.on('event', (event) => {
      window.webContents.send('desktop-pet:event', event);
    });
    bus.startPolling();
    lifecycleMonitor.start();

    ipcMain.handle('desktop-pet:append-outbox', async (_event, value) => {
      if (!isDesktopPetEvent(value) || value.type !== 'file.dropped') {
        throw new Error('Invalid outbox event');
      }
      await bus.appendOutbox(value);
    });

    ipcMain.handle('desktop-pet:read-file', async (_event, filePath: string) => {
      return readFileContent(filePath);
    });

    ipcMain.handle('desktop-pet:enrich-files', async (_event, files: Array<{ path: string; name: string; size: number }>) => {
      return enrichFileMetas(files);
    });

    ipcMain.handle('desktop-pet:get-pet-image', async (_event, spriteName: string) => {
      const mainDir = dirname(fileURLToPath(import.meta.url));
      const src = `${spriteName}.png`;
      const candidates = [
        join(mainDir, '..', '..', 'public', 'assets', 'pet', 'asuka', src),
        join(mainDir, 'public', 'assets', 'pet', 'asuka', src),
        join(app.getAppPath(), 'public', 'assets', 'pet', 'asuka', src),
        join(mainDir, '..', 'renderer', 'assets', src)
      ];
      let found: string | undefined;
      for (const p of candidates) {
        if (existsSync(p)) { found = p; break; }
      }
      if (!found) throw new Error(`Cannot find sprite: ${spriteName} (tried ${candidates.length} paths)`);
      const buf = readFileSync(found);
      return `data:image/png;base64,${buf.toString('base64')}`;
    });
  });

  app.on('window-all-closed', () => {});

  app.on('before-quit', () => {
    bus.stopPolling();
    lifecycleMonitor.stop();
  });
}
```

- [ ] **Step 5: Run monitor tests and confirm they pass**

Run:

```bash
npm test -- tests/processMonitor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run session tests again**

Run:

```bash
npm test -- tests/session.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/main/processMonitor.ts src/main/main.ts tests/processMonitor.test.ts
git commit -m "feat: close desktop pet with claude process"
```

---

### Task 3: Make the Hook Script Start and Bind the Pet Reliably

**Files:**
- Modify: `scripts/hook-pet.sh`

- [ ] **Step 1: Replace broad Electron detection with pidfile detection**

Update `scripts/hook-pet.sh` to:

```bash
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
```

- [ ] **Step 2: Manually run SessionStart through the hook script**

Run:

```bash
printf '{"hook_event_name":"SessionStart"}' | scripts/hook-pet.sh SessionStart
```

Expected: command prints `{"continue":true}` and exits 0.

- [ ] **Step 3: Confirm a session file is written when a Claude PID is discoverable**

Run:

```bash
powershell.exe -NoProfile -Command "Get-Content -Raw 'C:\Users\yuan\projects\claude-code-desktop-pet\.worktrees\desktop-pet-mvp\events\claude-session.json'"
```

Expected: JSON with positive `claudePid`, `startedAt`, and `updatedAt`. If run outside a Claude Code hook context and no PID is discoverable, note that startup still works and verify this again after settings hooks are installed.

- [ ] **Step 4: Confirm the pet process detection targets only this project**

Run:

```bash
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Select-Object ProcessId,CommandLine | Format-List"
```

Expected: at least one Electron command line includes `claude-code-desktop-pet` and `dist/main/main.js`.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/hook-pet.sh
git commit -m "feat: bind desktop pet startup to claude session"
```

---

### Task 4: Confirm Hook Mapping Keeps Stop as Waiting State

**Files:**
- Modify: `src/bridge/claudeHook.ts`
- Modify: `tests/claude-hook.test.ts`

- [ ] **Step 1: Inspect existing hook tests**

Run:

```bash
ls tests && sed -n '1,220p' tests/claude-hook.test.ts
```

Expected: existing tests import `mapHookInputToState` from `src/bridge/claudeHook.ts`.

- [ ] **Step 2: Add explicit tests for PascalCase hooks and Stop**

Append these tests to `tests/claude-hook.test.ts`:

```ts
it('maps PascalCase PreToolUse Read events to reading', () => {
  const result = mapHookInputToState('pre-tool-use', {
    tool_name: 'Read',
    tool_input: { file_path: 'README.md' }
  });

  expect(result).toEqual({ state: 'reading', message: '正在读资料' });
});

it('maps Stop to waiting_user instead of shutdown', () => {
  const result = mapHookInputToState('stop', {});

  expect(result).toEqual({ state: 'waiting_user', message: '我等你下一步指示' });
});
```

- [ ] **Step 3: Run hook tests**

Run:

```bash
npm test -- tests/claude-hook.test.ts
```

Expected: PASS. If this fails because `normalizeHookName` is not exported, do not export it; keep tests focused on `mapHookInputToState` and `runClaudeHook` behavior.

- [ ] **Step 4: If needed, keep `claudeHook.ts` behavior exactly as follows**

Only change `src/bridge/claudeHook.ts` if Step 3 fails. Ensure these branches exist:

```ts
if (hookName === 'session-start') {
  return { state: 'startup', message: 'Claude Code 启动啦' };
}

if (hookName === 'pre-tool-use') {
  const toolName = getToolName(record);
  const toolInput = getToolInput(record);
  return mapToolNameToState(toolName, toolInput);
}

if (hookName === 'post-tool-use') {
  if (record.error || record.is_error) {
    return { state: 'error', message: '工具执行出错了' };
  }
  return { state: 'thinking', message: '工具执行完成，继续分析' };
}

if (hookName === 'stop') {
  return { state: 'waiting_user', message: '我等你下一步指示' };
}
```

- [ ] **Step 5: Commit Task 4 if files changed**

```bash
git add src/bridge/claudeHook.ts tests/claude-hook.test.ts
git commit -m "test: cover claude hook stop mapping"
```

If no files changed, skip the commit.

---

### Task 5: Install Active Claude Code Hooks

**Files:**
- Modify: `scripts/install-claude-hook.ps1`
- Modify: `C:\Users\yuan\.claude\settings.json` during installation only

- [ ] **Step 1: Replace the print-only installer with a settings updater**

Update `scripts/install-claude-hook.ps1`:

```powershell
param(
  [string]$SettingsPath = "$HOME\.claude\settings.json",
  [switch]$PrintOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$HookScript = Join-Path $ProjectRoot "scripts\hook-pet.sh"
$BashCommand = "`"$HookScript`" `$CLAUDE_HOOK_EVENT_NAME"

function New-HookEntry([string]$Command) {
  return @{
    matcher = ""
    hooks = @(
      @{
        type = "command"
        command = $Command
      }
    )
  }
}

$hookEvents = @("SessionStart", "PreToolUse", "PostToolUse", "Stop")

if (-not (Test-Path $SettingsPath)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $SettingsPath) | Out-Null
  $settings = [ordered]@{}
} else {
  $raw = Get-Content -Raw $SettingsPath
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $settings = [ordered]@{}
  } else {
    $settings = $raw | ConvertFrom-Json -AsHashtable
  }
}

if (-not $settings.ContainsKey("hooks") -or $null -eq $settings.hooks) {
  $settings.hooks = [ordered]@{}
}

foreach ($eventName in $hookEvents) {
  $settings.hooks[$eventName] = @(New-HookEntry $BashCommand)
}

$json = $settings | ConvertTo-Json -Depth 20

if ($PrintOnly) {
  Write-Output $json
  exit 0
}

Set-Content -Path $SettingsPath -Value $json -Encoding UTF8
Write-Host "Installed Claude Code Desktop Pet hooks in $SettingsPath"
Write-Host "Restart Claude Code for SessionStart hook verification."
```

- [ ] **Step 2: Print the settings preview**

Run:

```bash
powershell.exe -ExecutionPolicy Bypass -File scripts/install-claude-hook.ps1 -PrintOnly
```

Expected: JSON containing existing settings plus `hooks.SessionStart`, `hooks.PreToolUse`, `hooks.PostToolUse`, and `hooks.Stop`.

- [ ] **Step 3: Install hooks into active settings**

Run:

```bash
powershell.exe -ExecutionPolicy Bypass -File scripts/install-claude-hook.ps1
```

Expected: `Installed Claude Code Desktop Pet hooks in C:\Users\yuan\.claude\settings.json`.

- [ ] **Step 4: Confirm active settings contain hooks**

Run:

```bash
powershell.exe -NoProfile -Command "Get-Content -Raw 'C:\Users\yuan\.claude\settings.json'"
```

Expected: the JSON contains the four hook event names and each command points to `scripts\hook-pet.sh` in this worktree.

- [ ] **Step 5: Commit Task 5 project script changes**

Do not commit `C:\Users\yuan\.claude\settings.json`; it is outside the repo. Commit only the installer script:

```bash
git add scripts/install-claude-hook.ps1
git commit -m "feat: install desktop pet claude hooks"
```

---

### Task 6: Update Handoff Documentation

**Files:**
- Modify: `docs/handoff.md`

- [ ] **Step 1: Add lifecycle integration notes**

Add this section near the current status section in `docs/handoff.md`:

```md
## Claude Code lifecycle integration

- Active hook installation target: `C:\Users\yuan\.claude\settings.json`.
- Hook entrypoint: `scripts/hook-pet.sh`.
- Hook events installed: `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`.
- State transport: `events/inbox.jsonl`.
- Claude process session file: `events/claude-session.json`.
- `Stop` maps to `waiting_user`; it does not close the desktop pet.
- Desktop pet exits when the recorded Claude Code PID in `events/claude-session.json` is no longer alive.

Verification commands:

```bash
printf '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":"README.md"}}' | scripts/hook-pet.sh PreToolUse
tail -n 3 events/inbox.jsonl
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Select-Object ProcessId,CommandLine | Format-List"
```
```

- [ ] **Step 2: Commit Task 6**

```bash
git add docs/handoff.md
git commit -m "docs: document claude lifecycle integration"
```

---

### Task 7: Runtime Verification

**Files:**
- No source edits expected unless verification finds a defect.

- [ ] **Step 1: Build the app**

Run:

```bash
npm run build
```

Expected: build completes successfully and `dist/main/main.js` exists.

- [ ] **Step 2: Manually trigger a startup hook**

Run:

```bash
printf '{"hook_event_name":"SessionStart"}' | scripts/hook-pet.sh SessionStart
```

Expected: `{"continue":true}` and the pet Electron process starts if it was not already running.

- [ ] **Step 3: Observe the pet process**

Run:

```bash
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Where-Object { $_.CommandLine -like '*claude-code-desktop-pet*' } | Select-Object ProcessId,CommandLine | Format-List"
```

Expected: at least one process with command line containing `claude-code-desktop-pet` and `dist/main/main.js`.

- [ ] **Step 4: Trigger a reading state**

Run:

```bash
printf '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":"README.md"}}' | scripts/hook-pet.sh PreToolUse
tail -n 2 events/inbox.jsonl
```

Expected: latest event contains `"state":"reading"` and `"message":"正在读资料"`.

- [ ] **Step 5: Trigger a coding state**

Run:

```bash
printf '{"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"README.md"}}' | scripts/hook-pet.sh PreToolUse
tail -n 2 events/inbox.jsonl
```

Expected: latest event contains `"state":"coding"` and `"message":"正在修改代码"`.

- [ ] **Step 6: Trigger Stop and confirm the pet stays running**

Run:

```bash
printf '{"hook_event_name":"Stop"}' | scripts/hook-pet.sh Stop
tail -n 2 events/inbox.jsonl
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Where-Object { $_.CommandLine -like '*claude-code-desktop-pet*' } | Select-Object ProcessId,CommandLine | Format-List"
```

Expected: latest event contains `"state":"waiting_user"`; the pet Electron process still exists.

- [ ] **Step 7: Verify real Claude Code hooks after restart**

Restart Claude Code, then in the new session use Read/Edit/Bash tools naturally. Check:

```bash
tail -n 10 events/inbox.jsonl
```

Expected: events are appended at the time of real Claude Code tool calls without manually running `scripts/hook-pet.sh`.

- [ ] **Step 8: Verify process-exit shutdown**

In a real Claude Code session after hooks are installed, close the Claude Code window with the top-right close button. Then inspect from a separate terminal:

```powershell
Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.CommandLine -like '*claude-code-desktop-pet*' } | Select-Object ProcessId,CommandLine | Format-List
```

Expected: no desktop pet Electron main process remains after the monitor interval has elapsed.

- [ ] **Step 9: Commit verification fixes only if needed**

If runtime verification required code fixes, commit the fixed files:

```bash
git add <changed-files>
git commit -m "fix: stabilize desktop pet lifecycle integration"
```

If no code changed, skip this step.

---

## Self-Review

- Spec coverage: startup hooks, state sync, Stop semantics, PID-bound shutdown, safer pet process detection, active settings installation, and runtime verification are all covered by Tasks 1-7.
- Placeholder scan: no TBD/TODO/fill-in placeholders are used.
- Type consistency: `ClaudeSession`, `claudePid`, `startedAt`, `updatedAt`, `paths.session`, `checkClaudeLifecycleOnce`, and `createClaudeLifecycleMonitor` are introduced before later tasks use them.
- Scope check: multiple simultaneous Claude Code sessions and Windows packaging are intentionally out of scope, matching the approved spec.
