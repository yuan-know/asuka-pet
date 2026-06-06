# Claude Code Lifecycle Link Design

## Goal

Implement reliable lifecycle integration between Claude Code and the desktop pet:

1. Starting a Claude Code session starts the desktop pet if it is not already running.
2. Claude Code hook events update the pet state in near real time.
3. Closing the Claude Code process or window closes the desktop pet.
4. Claude Code `Stop` only means the assistant is waiting for the next user input; it must not close the desktop pet.

## Current Root Cause

The pet stopped syncing because the active Claude Code user settings file at `C:\Users\yuan\.claude\settings.json` does not contain hook configuration. The project hook script can write state events when invoked manually, but Claude Code is not currently invoking it for real tool events.

## Recommended Approach

Use Claude Code hooks for startup and state updates, plus a PID-bound lifecycle monitor for shutdown.

This avoids treating `Stop` as process exit. It also avoids requiring the user to launch Claude Code through a custom wrapper.

## Components

### Claude Code settings hooks

Configure the active Claude Code settings file with hooks for:

- `SessionStart`
- `PreToolUse`
- `PostToolUse`
- `Stop`

Each hook calls the project script `scripts/hook-pet.sh` with the hook event name. Hook commands must exit successfully even when pet startup or event writing fails, so Claude Code is never blocked by desktop pet errors.

### Hook script

`scripts/hook-pet.sh` will:

1. Resolve the desktop pet project root.
2. Capture the current Claude Code process context.
3. Start the Electron pet if the pet main process is not already running.
4. Write or refresh a session file containing the Claude Code PID to monitor.
5. Forward the hook payload to `src/bridge/claudeHook.ts`.

The existing broad check for any `electron.exe` process will be replaced. The script should identify the pet process by pidfile and command line containing the desktop pet project path or app entrypoint.

### Bridge hook mapper

`src/bridge/claudeHook.ts` will continue mapping Claude Code hook events to pet states:

| Hook input | Pet state |
| --- | --- |
| `SessionStart` | `startup` |
| `PreToolUse` + `Read`/`Grep`/`Glob`/`WebFetch`/`WebSearch` | `reading` |
| `PreToolUse` + `Edit`/`Write`/`NotebookEdit` | `coding` |
| `PreToolUse` + `Bash` containing test/build/lint/typecheck commands | `testing` |
| `PreToolUse` + other tools | `tool_running` |
| successful `PostToolUse` | `thinking` |
| failed `PostToolUse` | `error` |
| `Stop` | `waiting_user` |

`Stop` must not emit a shutdown command.

### Session file

Add a small JSON session file under `events/`, for example `events/claude-session.json`:

```json
{
  "claudePid": 28544,
  "startedAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

The file records the Claude Code process that caused the pet to start. If no trustworthy PID can be found, startup and state sync should still work, but automatic shutdown is considered unavailable for that session and should be logged.

### Desktop pet lifecycle monitor

The Electron main process will periodically read the session file and check whether the recorded Claude Code PID is alive.

On Windows, the process check should use a safe local process query and confirm the PID still exists. If the PID no longer exists, Electron calls `app.quit()`.

The monitor should start after `app.whenReady()` and stop on `before-quit`.

### Event bus and renderer

No renderer architecture change is required. The existing JSONL event bus remains the state-sync transport:

```text
Claude Code hook -> hook-pet.sh -> claudeHook.ts -> events/inbox.jsonl -> Electron main -> renderer
```

## Error Handling

- Hook failures log to the bridge log and still return a Claude Code continue response.
- If the pet cannot start, the hook still writes the state event if possible and exits successfully.
- If the Claude Code PID cannot be detected, the pet does not auto-close for that session, but state sync continues.
- If the session file is malformed, the lifecycle monitor ignores it for that poll and keeps the pet running.
- `Stop` events update visual state only; they never terminate the app.

## Settings Installation

The implementation should update or add an installer helper that can write the needed hooks into `C:\Users\yuan\.claude\settings.json` or print the exact JSON block before writing if direct settings modification is not desired.

Because the active settings file currently has no hooks, state sync will not work until this settings step is completed.

## Verification Plan

Runtime verification must observe the real surfaces:

1. Configure hooks in active Claude Code settings.
2. Start a new Claude Code session and observe the desktop pet process appears.
3. Trigger a read tool event and observe `reading` in `events/inbox.jsonl` and in the pet UI.
4. Trigger an edit or write event and observe `coding`.
5. End a response and observe `Stop` maps to `waiting_user` without closing the pet.
6. Close the Claude Code process or window and observe the Electron desktop pet process exits.
7. Confirm hook output never blocks Claude Code.

## Out of Scope

- Changing the pet visual design.
- Packaging a standalone Windows installer.
- Supporting multiple simultaneous Claude Code sessions with independent pet instances.
- Replacing JSONL with WebSocket or IPC transport.
