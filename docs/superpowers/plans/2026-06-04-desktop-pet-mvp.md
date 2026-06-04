# Claude Code Desktop Pet MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Windows-focused Electron + TypeScript MVP of a Claude Code desktop pet that shows a transparent pet window, reacts to local JSONL state events, accepts dragged files, and provides Claude Code bridge scripts.

**Architecture:** The app is split into focused units: shared event protocol and path utilities, a JSONL event bus, a pet state machine, an Electron main process, a React renderer, and bridge scripts for Claude Code hooks. The MVP uses JSONL files for cross-process communication so the app, hooks, and future agents can inspect and resume work without hidden state.

**Tech Stack:** Electron, electron-vite, React, TypeScript, Vitest, Node.js fs/path APIs, JSONL event files, PowerShell hook helper scripts.

---

## File Structure Map

Create or modify these files under `C:/Users/yuan/projects/claude-code-desktop-pet`.

### Project tooling

- Create `package.json`: npm scripts, dependencies, dev dependencies.
- Create `tsconfig.json`: strict TypeScript settings shared by main, renderer, bridge, and tests.
- Create `electron.vite.config.ts`: Electron/Vite build entries.
- Create `index.html`: renderer HTML entry.
- Modify `.gitignore`: keep generated files out of git while tracking `events/.gitkeep`.

### Shared protocol and utilities

- Create `src/shared/eventTypes.ts`: event type definitions, state/action enums, type guards, event factory helpers.
- Create `src/shared/paths.ts`: stable project-root and event-file path helpers.
- Create `src/shared/logger.ts`: small file/console logger that never throws to callers.
- Create `src/shared/jsonl.ts`: append/read JSONL helpers used by app and bridge.

### Event bus and state logic

- Create `src/main/eventBus.ts`: main-process JSONL polling and append wrapper.
- Create `src/renderer/pet/states.ts`: state definitions, priorities, timeouts, animation names.
- Create `src/renderer/pet/stateMachine.ts`: deterministic state reducer and timeout fallback logic.
- Create `src/renderer/pet/personality.ts`: Chinese bubble templates.
- Create `src/renderer/pet/fileDropEvent.ts`: converts Electron/DOM file drops into protocol events.

### Electron app

- Create `src/main/main.ts`: Electron app lifecycle.
- Create `src/main/window.ts`: transparent always-on-top pet window creation.
- Create `src/main/tray.ts`: tray menu for show/hide/reload/quit.
- Create `src/preload/index.ts`: safe IPC bridge for renderer.

### Renderer UI

- Create `src/renderer/main.tsx`: React entry.
- Create `src/renderer/App.tsx`: app state wiring.
- Create `src/renderer/components/PetStage.tsx`: visual pet stage.
- Create `src/renderer/components/SpeechBubble.tsx`: speech bubble.
- Create `src/renderer/components/ActionMenu.tsx`: file action menu.
- Create `src/renderer/styles.css`: transparent body, pet animations, menu styles.

### Claude Code bridge

- Create `src/bridge/emitEvent.ts`: development command to emit state events.
- Create `src/bridge/claudeHook.ts`: hook command entry and tool-to-state mapping.
- Create `src/bridge/watchOutbox.ts`: prints unprocessed file-drop events.
- Create `scripts/install-claude-hook.ps1`: project-level hook installer draft.
- Create `scripts/uninstall-claude-hook.ps1`: hook removal helper draft.

### Tests

- Create `tests/event-protocol.test.ts`: event validation and factory tests.
- Create `tests/jsonl.test.ts`: JSONL append/read tests.
- Create `tests/state-machine.test.ts`: state priority and timeout tests.
- Create `tests/file-drop.test.ts`: file metadata/action event tests.
- Create `tests/claude-hook.test.ts`: hook mapping tests.

### Documentation

- Modify `README.md`: add install/run/test commands after tooling exists.
- Modify `docs/handoff.md`: update after each task.
- Modify `docs/decisions.md`: record any deviation from this plan.
- Modify `docs/event-protocol.md`: keep protocol examples synchronized with code.
- Modify `docs/mvp-roadmap.md`: mark phase progress.

---

## Task 0: Tooling and Repository Baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `electron.vite.config.ts`
- Create: `index.html`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Check tool availability**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
node --version
npm --version
git --version
```

Expected:

```text
node prints a version, npm prints a version, git prints a version
```

If `node` or `npm` is missing, stop and ask the user to install Node.js LTS before continuing. Do not scaffold by guessing a package manager.

- [ ] **Step 2: Configure local git identity if missing**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
if ! git config user.email >/dev/null; then git config user.email "yuan@example.local"; fi
if ! git config user.name >/dev/null; then git config user.name "yuan"; fi
git config user.name
git config user.email
```

Expected:

```text
yuan
yuan@example.local
```

This uses repository-local identity only. If the user prefers a real name/email later, update this config before publishing anywhere.

- [ ] **Step 3: Write `package.json`**

Create `package.json` with this content:

```json
{
  "name": "claude-code-desktop-pet",
  "version": "0.1.0",
  "private": true,
  "description": "Windows-focused Claude Code desktop pet MVP",
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "tsc --noEmit && electron-vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "emit": "tsx src/bridge/emitEvent.ts",
    "bridge:hook": "tsx src/bridge/claudeHook.ts",
    "bridge:watch-outbox": "tsx src/bridge/watchOutbox.ts",
    "package": "npm run build && electron-builder --win portable"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "electron-vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "electron": "latest",
    "electron-builder": "latest",
    "jsdom": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  },
  "build": {
    "appId": "local.claude-code-desktop-pet",
    "productName": "Claude Code Desktop Pet",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**",
      "package.json"
    ],
    "win": {
      "target": "portable"
    }
  }
}
```

- [ ] **Step 4: Write TypeScript and Electron Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "electron.vite.config.ts"]
}
```

Create `electron.vite.config.ts`:

```ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: 'src/main/main.ts'
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: 'src/preload/index.ts'
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    }
  }
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Code Desktop Pet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Update `.gitignore`**

Replace `.gitignore` with:

```gitignore
node_modules/
dist/
out/
build/
release/
.env
.DS_Store
.superpowers/
events/*.jsonl
!events/.gitkeep
npm-debug.log*
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm install
```

Expected:

```text
added ... packages
```

If npm reports vulnerability counts, do not stop. Record them in `docs/handoff.md` only if npm reports install failure or a blocking peer dependency conflict.

- [ ] **Step 7: Update README and handoff**

Append to `README.md`:

```markdown

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run emit -- thinking
```

## 当前实现状态

- Phase 0 正在进行：项目工具链与基础目录。
- 代码实现必须同步更新 `docs/handoff.md`。
```

Update `docs/handoff.md` current status section to include:

```markdown
## 当前实现状态

- Phase 0 已开始。
- npm 工具链计划使用 Electron、electron-vite、React、TypeScript、Vitest。
- 下一步是实现共享事件协议和 JSONL 工具。
```

- [ ] **Step 8: Run baseline checks**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run typecheck
npm test
```

Expected at this point:

```text
typecheck may fail because src files do not exist yet
vitest may report no test files
```

Record the exact output in `docs/handoff.md` under `## 验证记录`. This is a baseline, not a success claim.

- [ ] **Step 9: Commit tooling baseline**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add package.json package-lock.json tsconfig.json electron.vite.config.ts index.html .gitignore README.md docs/handoff.md
git commit -m "chore: scaffold electron tooling" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:

```text
[main ...] chore: scaffold electron tooling
```

---

## Task 1: Shared Event Protocol

**Files:**
- Create: `src/shared/eventTypes.ts`
- Create: `tests/event-protocol.test.ts`
- Modify: `docs/event-protocol.md`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Write failing protocol tests**

Create `tests/event-protocol.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createPetStateEvent,
  createFileDroppedEvent,
  isDesktopPetEvent,
  PET_STATES,
  FILE_ACTIONS
} from '../src/shared/eventTypes';

describe('desktop pet event protocol', () => {
  it('creates valid pet state events', () => {
    const event = createPetStateEvent({
      source: 'test',
      state: 'coding',
      message: '正在修改代码',
      detail: { tool: 'Edit', file: 'src/main.ts' }
    });

    expect(event.type).toBe('pet.state');
    expect(event.payload.state).toBe('coding');
    expect(event.payload.message).toBe('正在修改代码');
    expect(isDesktopPetEvent(event)).toBe(true);
  });

  it('creates valid file dropped events', () => {
    const event = createFileDroppedEvent({
      source: 'desktop-pet',
      paths: ['C:/Users/yuan/Desktop/example.pdf'],
      action: 'send_to_claude',
      meta: [
        {
          path: 'C:/Users/yuan/Desktop/example.pdf',
          name: 'example.pdf',
          extension: '.pdf',
          size: 2457600
        }
      ]
    });

    expect(event.type).toBe('file.dropped');
    expect(event.payload.paths).toEqual(['C:/Users/yuan/Desktop/example.pdf']);
    expect(event.payload.action).toBe('send_to_claude');
    expect(isDesktopPetEvent(event)).toBe(true);
  });

  it('rejects malformed events', () => {
    expect(isDesktopPetEvent({})).toBe(false);
    expect(isDesktopPetEvent({ type: 'pet.state' })).toBe(false);
    expect(isDesktopPetEvent({ id: 'x', time: 'x', source: 'x', type: 'bad', payload: {} })).toBe(false);
  });

  it('exports the expected state and action enums', () => {
    expect(PET_STATES).toContain('thinking');
    expect(PET_STATES).toContain('file_received');
    expect(FILE_ACTIONS).toContain('send_to_claude');
    expect(FILE_ACTIONS).toContain('record_only');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/event-protocol.test.ts
```

Expected:

```text
FAIL tests/event-protocol.test.ts
Cannot find module '../src/shared/eventTypes'
```

- [ ] **Step 3: Implement protocol types and factories**

Create `src/shared/eventTypes.ts`:

```ts
export const PET_STATES = [
  'startup',
  'idle',
  'thinking',
  'tool_running',
  'reading',
  'coding',
  'testing',
  'waiting_user',
  'success',
  'error',
  'file_hover',
  'file_received',
  'sleepy'
] as const;

export type PetState = (typeof PET_STATES)[number];

export const FILE_ACTIONS = [
  'send_to_claude',
  'add_to_project_context',
  'record_only',
  'cancel'
] as const;

export type FileAction = (typeof FILE_ACTIONS)[number];

export interface DesktopPetEventBase<TType extends string, TPayload> {
  id: string;
  time: string;
  source: string;
  type: TType;
  payload: TPayload;
}

export interface PetStatePayload {
  state: PetState;
  message: string;
  detail?: Record<string, unknown>;
}

export interface FileMeta {
  path: string;
  name: string;
  extension: string;
  size: number;
}

export interface FileDroppedPayload {
  paths: string[];
  action: FileAction;
  meta: FileMeta[];
}

export type PetStateEvent = DesktopPetEventBase<'pet.state', PetStatePayload>;
export type FileDroppedEvent = DesktopPetEventBase<'file.dropped', FileDroppedPayload>;
export type DesktopPetEvent = PetStateEvent | FileDroppedEvent;

export function createEventId(prefix = 'evt'): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export function createPetStateEvent(input: {
  source: string;
  state: PetState;
  message: string;
  detail?: Record<string, unknown>;
}): PetStateEvent {
  return {
    id: createEventId('evt_state'),
    time: new Date().toISOString(),
    source: input.source,
    type: 'pet.state',
    payload: {
      state: input.state,
      message: input.message,
      detail: input.detail
    }
  };
}

export function createFileDroppedEvent(input: {
  source: string;
  paths: string[];
  action: FileAction;
  meta: FileMeta[];
}): FileDroppedEvent {
  return {
    id: createEventId('evt_file'),
    time: new Date().toISOString(),
    source: input.source,
    type: 'file.dropped',
    payload: {
      paths: input.paths,
      action: input.action,
      meta: input.meta
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPetState(value: unknown): value is PetState {
  return typeof value === 'string' && PET_STATES.includes(value as PetState);
}

function isFileAction(value: unknown): value is FileAction {
  return typeof value === 'string' && FILE_ACTIONS.includes(value as FileAction);
}

function isFileMeta(value: unknown): value is FileMeta {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.name === 'string' &&
    typeof value.extension === 'string' &&
    typeof value.size === 'number'
  );
}

export function isDesktopPetEvent(value: unknown): value is DesktopPetEvent {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.time !== 'string') return false;
  if (typeof value.source !== 'string') return false;
  if (!isRecord(value.payload)) return false;

  if (value.type === 'pet.state') {
    return isPetState(value.payload.state) && typeof value.payload.message === 'string';
  }

  if (value.type === 'file.dropped') {
    return (
      Array.isArray(value.payload.paths) &&
      value.payload.paths.every((item) => typeof item === 'string') &&
      isFileAction(value.payload.action) &&
      Array.isArray(value.payload.meta) &&
      value.payload.meta.every(isFileMeta)
    );
  }

  return false;
}
```

- [ ] **Step 4: Run protocol tests**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/event-protocol.test.ts
npm run typecheck
```

Expected:

```text
PASS tests/event-protocol.test.ts
```

- [ ] **Step 5: Update protocol docs**

Append to `docs/event-protocol.md`:

```markdown

## 代码来源

事件枚举、TypeScript 类型、工厂函数和运行时校验位于：

- `src/shared/eventTypes.ts`

测试位于：

- `tests/event-protocol.test.ts`
```

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成共享事件协议：`src/shared/eventTypes.ts`。
- 已完成协议测试：`tests/event-protocol.test.ts`。
- 下一步是 JSONL 读写工具和事件路径工具。
```

- [ ] **Step 6: Commit event protocol**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/shared/eventTypes.ts tests/event-protocol.test.ts docs/event-protocol.md docs/handoff.md
git commit -m "feat: add desktop pet event protocol" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: JSONL Event Storage and Paths

**Files:**
- Create: `src/shared/paths.ts`
- Create: `src/shared/logger.ts`
- Create: `src/shared/jsonl.ts`
- Create: `tests/jsonl.test.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Write failing JSONL tests**

Create `tests/jsonl.test.ts`:

```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendJsonLine, readJsonLines } from '../src/shared/jsonl';
import { getEventPaths } from '../src/shared/paths';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'desktop-pet-jsonl-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('jsonl utilities', () => {
  it('appends and reads json lines', async () => {
    const file = path.join(tempDir, 'events.jsonl');

    await appendJsonLine(file, { type: 'one', value: 1 });
    await appendJsonLine(file, { type: 'two', value: 2 });

    await expect(readFile(file, 'utf8')).resolves.toContain('{"type":"one","value":1}');
    await expect(readJsonLines(file)).resolves.toEqual([
      { type: 'one', value: 1 },
      { type: 'two', value: 2 }
    ]);
  });

  it('returns an empty array for missing files', async () => {
    await expect(readJsonLines(path.join(tempDir, 'missing.jsonl'))).resolves.toEqual([]);
  });

  it('skips malformed lines without throwing', async () => {
    const file = path.join(tempDir, 'events.jsonl');
    await appendJsonLine(file, { ok: true });
    await import('node:fs/promises').then((fs) => fs.appendFile(file, 'not-json\n', 'utf8'));

    await expect(readJsonLines(file)).resolves.toEqual([{ ok: true }]);
  });
});

describe('event paths', () => {
  it('builds inbox and outbox paths below the project root', () => {
    const paths = getEventPaths(tempDir);

    expect(paths.eventsDir).toBe(path.join(tempDir, 'events'));
    expect(paths.inbox).toBe(path.join(tempDir, 'events', 'inbox.jsonl'));
    expect(paths.outbox).toBe(path.join(tempDir, 'events', 'outbox.jsonl'));
    expect(paths.processed).toBe(path.join(tempDir, 'events', 'processed.jsonl'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/jsonl.test.ts
```

Expected:

```text
FAIL tests/jsonl.test.ts
Cannot find module '../src/shared/jsonl'
```

- [ ] **Step 3: Implement path helpers**

Create `src/shared/paths.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface EventPaths {
  projectRoot: string;
  eventsDir: string;
  inbox: string;
  outbox: string;
  processed: string;
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
    logsDir,
    bridgeLog: path.join(logsDir, 'bridge.log')
  };
}
```

- [ ] **Step 4: Implement logger and JSONL helpers**

Create `src/shared/logger.ts`:

```ts
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

export async function logLine(filePath: string, message: string): Promise<void> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    const line = `[${new Date().toISOString()}] ${message}\n`;
    await appendFile(filePath, line, 'utf8');
  } catch (error) {
    console.warn('desktop pet logger failed:', error);
  }
}
```

Create `src/shared/jsonl.ts`:

```ts
import { mkdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

export async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

export async function readJsonLines(filePath: string): Promise<unknown[]> {
  let content = '';

  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') return [];
    throw error;
  }

  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}
```

- [ ] **Step 5: Run JSONL tests and typecheck**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/jsonl.test.ts
npm run typecheck
```

Expected:

```text
PASS tests/jsonl.test.ts
```

- [ ] **Step 6: Update docs**

Append to `docs/architecture.md`:

```markdown

## JSONL 事件存储

事件路径由 `src/shared/paths.ts` 生成。JSONL 读写由 `src/shared/jsonl.ts` 提供：

- `appendJsonLine(filePath, value)`：确保目录存在并追加一行 JSON。
- `readJsonLines(filePath)`：读取所有有效 JSON 行，缺失文件返回空数组，坏行跳过。

日志写入由 `src/shared/logger.ts` 提供，日志失败不会中断调用方。
```

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成共享事件协议。
- 已完成 JSONL 读写、路径工具和非阻塞日志工具。
- 下一步是桌宠状态定义和状态机。
```

- [ ] **Step 7: Commit JSONL storage**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/shared/paths.ts src/shared/logger.ts src/shared/jsonl.ts tests/jsonl.test.ts docs/architecture.md docs/handoff.md
git commit -m "feat: add jsonl event storage" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Pet State Definitions and State Machine

**Files:**
- Create: `src/renderer/pet/states.ts`
- Create: `src/renderer/pet/personality.ts`
- Create: `src/renderer/pet/stateMachine.ts`
- Create: `tests/state-machine.test.ts`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Write failing state machine tests**

Create `tests/state-machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getBubbleForState } from '../src/renderer/pet/personality';
import { getStateConfig } from '../src/renderer/pet/states';
import { createInitialPetViewState, reducePetStateEvent, resolveTimedOutState } from '../src/renderer/pet/stateMachine';

describe('pet state configuration', () => {
  it('assigns higher priority to file_received than coding', () => {
    expect(getStateConfig('file_received').priority).toBeGreaterThan(getStateConfig('coding').priority);
  });

  it('has a Chinese bubble for coding', () => {
    expect(getBubbleForState('coding')).toContain('代码');
  });
});

describe('pet state machine', () => {
  it('starts idle', () => {
    expect(createInitialPetViewState().state).toBe('idle');
  });

  it('accepts higher priority incoming events', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'thinking',
      message: '让我想想',
      now: 1000
    });

    const next = reducePetStateEvent(current, {
      state: 'file_received',
      message: '收到文件',
      now: 2000
    });

    expect(next.state).toBe('file_received');
    expect(next.message).toBe('收到文件');
  });

  it('keeps higher priority state when lower priority event arrives quickly', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'error',
      message: '出错了',
      now: 1000
    });

    const next = reducePetStateEvent(current, {
      state: 'thinking',
      message: '思考中',
      now: 1500
    });

    expect(next.state).toBe('error');
    expect(next.message).toBe('出错了');
  });

  it('falls back to idle after timeout', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'success',
      message: '搞定',
      now: 1000
    });

    const next = resolveTimedOutState(current, 1000 + getStateConfig('success').timeoutMs + 1);
    expect(next.state).toBe('idle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/state-machine.test.ts
```

Expected:

```text
FAIL tests/state-machine.test.ts
Cannot find module '../src/renderer/pet/personality'
```

- [ ] **Step 3: Implement state configs**

Create `src/renderer/pet/states.ts`:

```ts
import type { PetState } from '../../shared/eventTypes';

export interface PetStateConfig {
  state: PetState;
  animation: string;
  priority: number;
  timeoutMs: number;
}

export const PET_STATE_CONFIGS: Record<PetState, PetStateConfig> = {
  startup: { state: 'startup', animation: 'wave-in', priority: 60, timeoutMs: 5000 },
  idle: { state: 'idle', animation: 'idle-breathe', priority: 0, timeoutMs: 0 },
  thinking: { state: 'thinking', animation: 'thinking-pulse', priority: 40, timeoutMs: 15000 },
  tool_running: { state: 'tool_running', animation: 'working-bounce', priority: 50, timeoutMs: 12000 },
  reading: { state: 'reading', animation: 'reading-sway', priority: 52, timeoutMs: 12000 },
  coding: { state: 'coding', animation: 'coding-tap', priority: 55, timeoutMs: 12000 },
  testing: { state: 'testing', animation: 'testing-watch', priority: 56, timeoutMs: 15000 },
  waiting_user: { state: 'waiting_user', animation: 'poke-screen', priority: 20, timeoutMs: 10000 },
  success: { state: 'success', animation: 'victory-pop', priority: 70, timeoutMs: 7000 },
  error: { state: 'error', animation: 'sweat-shake', priority: 90, timeoutMs: 9000 },
  file_hover: { state: 'file_hover', animation: 'reach-out', priority: 80, timeoutMs: 3000 },
  file_received: { state: 'file_received', animation: 'hug-file', priority: 95, timeoutMs: 10000 },
  sleepy: { state: 'sleepy', animation: 'sleepy-nod', priority: 5, timeoutMs: 0 }
};

export function getStateConfig(state: PetState): PetStateConfig {
  return PET_STATE_CONFIGS[state];
}
```

- [ ] **Step 4: Implement personality bubbles**

Create `src/renderer/pet/personality.ts`:

```ts
import type { PetState } from '../../shared/eventTypes';

const BUBBLES: Record<PetState, string[]> = {
  startup: ['我来啦，今天也别拖后腿哦。'],
  idle: ['暂时没事？那我就盯着你啦。'],
  thinking: ['别催，我正在想。'],
  tool_running: ['工具启动，交给我盯着。'],
  reading: ['我在翻资料，别乱动。'],
  coding: ['代码这种程度，我当然能看懂。'],
  testing: ['测试中……最好一次过。'],
  waiting_user: ['喂，该你说话了。'],
  success: ['看吧，我说能搞定。'],
  error: ['哈？这不是我的问题吧……我再看看。'],
  file_hover: ['拿来吧，我接着。'],
  file_received: ['收到，我帮你记下来了。'],
  sleepy: ['再不动我就睡着了……']
};

export function getBubbleForState(state: PetState): string {
  return BUBBLES[state][0];
}
```

- [ ] **Step 5: Implement state machine**

Create `src/renderer/pet/stateMachine.ts`:

```ts
import type { PetState } from '../../shared/eventTypes';
import { getBubbleForState } from './personality';
import { getStateConfig } from './states';

export interface PetViewState {
  state: PetState;
  animation: string;
  message: string;
  enteredAt: number;
}

export interface IncomingPetState {
  state: PetState;
  message?: string;
  now: number;
}

export function createInitialPetViewState(now = Date.now()): PetViewState {
  const config = getStateConfig('idle');
  return {
    state: 'idle',
    animation: config.animation,
    message: getBubbleForState('idle'),
    enteredAt: now
  };
}

export function reducePetStateEvent(current: PetViewState, incoming: IncomingPetState): PetViewState {
  const currentConfig = getStateConfig(current.state);
  const incomingConfig = getStateConfig(incoming.state);
  const currentTimedOut = resolveTimedOutState(current, incoming.now).state === 'idle';

  if (!currentTimedOut && incomingConfig.priority < currentConfig.priority) {
    return current;
  }

  return {
    state: incoming.state,
    animation: incomingConfig.animation,
    message: incoming.message || getBubbleForState(incoming.state),
    enteredAt: incoming.now
  };
}

export function resolveTimedOutState(current: PetViewState, now: number): PetViewState {
  const config = getStateConfig(current.state);
  if (config.timeoutMs === 0) return current;
  if (now - current.enteredAt <= config.timeoutMs) return current;
  return createInitialPetViewState(now);
}
```

- [ ] **Step 6: Run state tests**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/state-machine.test.ts
npm run typecheck
```

Expected:

```text
PASS tests/state-machine.test.ts
```

- [ ] **Step 7: Update handoff and commit**

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成共享事件协议。
- 已完成 JSONL 读写与路径工具。
- 已完成桌宠状态配置、中文气泡和优先级状态机。
- 下一步是 Electron 主窗口、托盘和 IPC。
```

Commit:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/renderer/pet/states.ts src/renderer/pet/personality.ts src/renderer/pet/stateMachine.ts tests/state-machine.test.ts docs/handoff.md
git commit -m "feat: add pet state machine" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Electron Main Process, Window, Tray, and IPC

**Files:**
- Create: `src/main/window.ts`
- Create: `src/main/tray.ts`
- Create: `src/main/eventBus.ts`
- Create: `src/main/main.ts`
- Create: `src/preload/index.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Implement main-process event bus**

Create `src/main/eventBus.ts`:

```ts
import { EventEmitter } from 'node:events';
import { appendJsonLine, readJsonLines } from '../shared/jsonl';
import { getEventPaths } from '../shared/paths';
import { isDesktopPetEvent, type DesktopPetEvent } from '../shared/eventTypes';

export class MainEventBus extends EventEmitter {
  private seenIds = new Set<string>();
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly projectRoot?: string) {
    super();
  }

  startPolling(intervalMs = 800): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), intervalMs);
    void this.poll();
  }

  stopPolling(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async appendOutbox(event: DesktopPetEvent): Promise<void> {
    const paths = getEventPaths(this.projectRoot);
    await appendJsonLine(paths.outbox, event);
  }

  async poll(): Promise<void> {
    const paths = getEventPaths(this.projectRoot);
    const lines = await readJsonLines(paths.inbox);
    for (const line of lines) {
      if (!isDesktopPetEvent(line)) continue;
      if (this.seenIds.has(line.id)) continue;
      this.seenIds.add(line.id);
      this.emit('event', line);
    }
  }
}
```

- [ ] **Step 2: Implement transparent window**

Create `src/main/window.ts`:

```ts
import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const width = 360;
  const height = 420;
  const x = display.workArea.x + display.workArea.width - width - 40;
  const y = display.workArea.y + display.workArea.height - height - 40;

  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.setAlwaysOnTop(true, 'floating');

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
}
```

- [ ] **Step 3: Implement tray menu**

Create `src/main/tray.ts`:

```ts
import { BrowserWindow, Menu, Tray, nativeImage, app } from 'electron';

let tray: Tray | undefined;

export function createPetTray(window: BrowserWindow): Tray {
  const image = nativeImage.createEmpty();
  tray = new Tray(image);
  tray.setToolTip('Claude Code Desktop Pet');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示桌宠', click: () => window.show() },
      { label: '隐藏桌宠', click: () => window.hide() },
      { label: '重新载入', click: () => window.reload() },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ])
  );
  return tray;
}

export function getPetTray(): Tray | undefined {
  return tray;
}
```

- [ ] **Step 4: Implement preload API**

Create `src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopPetEvent, FileDroppedEvent } from '../shared/eventTypes';

export interface DesktopPetApi {
  onEvent(callback: (event: DesktopPetEvent) => void): () => void;
  appendOutbox(event: FileDroppedEvent): Promise<void>;
}

const api: DesktopPetApi = {
  onEvent(callback) {
    const listener = (_: Electron.IpcRendererEvent, event: DesktopPetEvent) => callback(event);
    ipcRenderer.on('desktop-pet:event', listener);
    return () => ipcRenderer.removeListener('desktop-pet:event', listener);
  },
  appendOutbox(event) {
    return ipcRenderer.invoke('desktop-pet:append-outbox', event);
  }
};

contextBridge.exposeInMainWorld('desktopPet', api);
```

- [ ] **Step 5: Implement app lifecycle**

Create `src/main/main.ts`:

```ts
import { app, ipcMain } from 'electron';
import { MainEventBus } from './eventBus';
import { createPetTray } from './tray';
import { createPetWindow } from './window';
import { isDesktopPetEvent } from '../shared/eventTypes';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  const bus = new MainEventBus();

  app.whenReady().then(() => {
    const window = createPetWindow();
    createPetTray(window);

    bus.on('event', (event) => {
      window.webContents.send('desktop-pet:event', event);
    });
    bus.startPolling();

    ipcMain.handle('desktop-pet:append-outbox', async (_event, value) => {
      if (!isDesktopPetEvent(value) || value.type !== 'file.dropped') {
        throw new Error('Invalid outbox event');
      }
      await bus.appendOutbox(value);
    });
  });

  app.on('window-all-closed', (event) => {
    event.preventDefault();
  });

  app.on('before-quit', () => {
    bus.stopPolling();
  });
}
```

- [ ] **Step 6: Add renderer global type**

Create `src/renderer/global.d.ts`:

```ts
import type { DesktopPetApi } from '../preload/index';

declare global {
  interface Window {
    desktopPet: DesktopPetApi;
  }
}
```

- [ ] **Step 7: Run typecheck**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run typecheck
```

Expected:

```text
No TypeScript errors related to main/preload files
```

- [ ] **Step 8: Update docs and commit**

Append to `docs/architecture.md`:

```markdown

## Electron 主进程

- `src/main/window.ts` 创建透明、无边框、置顶的桌宠窗口。
- `src/main/tray.ts` 创建托盘菜单。
- `src/main/eventBus.ts` 轮询 `events/inbox.jsonl` 并通过 IPC 推送事件。
- `src/preload/index.ts` 暴露最小安全 API 给 Renderer。
```

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成 Electron 主进程窗口、托盘、事件轮询和 IPC 桥。
- 下一步是 React Renderer 桌宠界面。
```

Commit:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/main src/preload src/renderer/global.d.ts docs/architecture.md docs/handoff.md
git commit -m "feat: add electron pet shell" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Renderer Pet UI and State Reactions

**Files:**
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/components/PetStage.tsx`
- Create: `src/renderer/components/SpeechBubble.tsx`
- Create: `src/renderer/components/ActionMenu.tsx`
- Create: `src/renderer/styles.css`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Create renderer entry**

Create `src/renderer/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create speech bubble component**

Create `src/renderer/components/SpeechBubble.tsx`:

```tsx
interface SpeechBubbleProps {
  message: string;
}

export function SpeechBubble({ message }: SpeechBubbleProps): JSX.Element {
  return <div className="speech-bubble">{message}</div>;
}
```

- [ ] **Step 3: Create pet stage component**

Create `src/renderer/components/PetStage.tsx`:

```tsx
import type { PetViewState } from '../pet/stateMachine';

interface PetStageProps {
  viewState: PetViewState;
  onPetClick: () => void;
}

export function PetStage({ viewState, onPetClick }: PetStageProps): JSX.Element {
  return (
    <button className={`pet-stage pet-${viewState.animation}`} onClick={onPetClick} aria-label="Claude Code 桌宠">
      <div className="pet-head">
        <span className="pet-eye pet-eye-left" />
        <span className="pet-eye pet-eye-right" />
      </div>
      <div className="pet-body">
        <span className="pet-badge">CC</span>
      </div>
      <div className="pet-state-label">{viewState.state}</div>
    </button>
  );
}
```

- [ ] **Step 4: Create action menu component**

Create `src/renderer/components/ActionMenu.tsx`:

```tsx
import type { FileAction } from '../../shared/eventTypes';

interface ActionMenuProps {
  fileCount: number;
  onSelect: (action: FileAction) => void;
}

export function ActionMenu({ fileCount, onSelect }: ActionMenuProps): JSX.Element {
  return (
    <div className="action-menu">
      <div className="action-menu-title">收到 {fileCount} 个文件</div>
      <button onClick={() => onSelect('send_to_claude')}>交给 Claude 看看</button>
      <button onClick={() => onSelect('add_to_project_context')}>加入当前项目资料</button>
      <button onClick={() => onSelect('record_only')}>只记录路径</button>
      <button onClick={() => onSelect('cancel')}>取消</button>
    </div>
  );
}
```

- [ ] **Step 5: Create app state wiring**

Create `src/renderer/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { FileAction } from '../shared/eventTypes';
import { createInitialPetViewState, reducePetStateEvent, resolveTimedOutState } from './pet/stateMachine';
import { getBubbleForState } from './pet/personality';
import { PetStage } from './components/PetStage';
import { SpeechBubble } from './components/SpeechBubble';
import { ActionMenu } from './components/ActionMenu';
import { createFileDroppedEventFromFiles } from './pet/fileDropEvent';

export function App(): JSX.Element {
  const [viewState, setViewState] = useState(() => createInitialPetViewState());
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const hasDroppedFiles = droppedFiles.length > 0;

  useEffect(() => {
    const unsubscribe = window.desktopPet.onEvent((event) => {
      if (event.type !== 'pet.state') return;
      setViewState((current) =>
        reducePetStateEvent(current, {
          state: event.payload.state,
          message: event.payload.message,
          now: Date.now()
        })
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setViewState((current) => resolveTimedOutState(current, Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dragHandlers = useMemo(
    () => ({
      onDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setViewState((current) =>
          reducePetStateEvent(current, {
            state: 'file_hover',
            message: getBubbleForState('file_hover'),
            now: Date.now()
          })
        );
      },
      onDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;
        setDroppedFiles(files);
        setViewState((current) =>
          reducePetStateEvent(current, {
            state: 'file_received',
            message: `收到 ${files.length} 个文件。`,
            now: Date.now()
          })
        );
      }
    }),
    []
  );

  async function handleAction(action: FileAction): Promise<void> {
    if (action !== 'cancel') {
      const event = createFileDroppedEventFromFiles(droppedFiles, action);
      await window.desktopPet.appendOutbox(event);
    }
    setDroppedFiles([]);
  }

  function handlePetClick(): void {
    setViewState((current) =>
      reducePetStateEvent(current, {
        state: 'waiting_user',
        message: '喂，我在这呢。',
        now: Date.now()
      })
    );
  }

  return (
    <div className="app" {...dragHandlers}>
      <SpeechBubble message={viewState.message} />
      <PetStage viewState={viewState} onPetClick={handlePetClick} />
      {hasDroppedFiles ? <ActionMenu fileCount={droppedFiles.length} onSelect={handleAction} /> : null}
    </div>
  );
}
```

- [ ] **Step 6: Create file drop event helper**

Create `src/renderer/pet/fileDropEvent.ts`:

```ts
import path from 'node:path';
import { createFileDroppedEvent, type FileAction, type FileDroppedEvent, type FileMeta } from '../../shared/eventTypes';

interface DroppedFileLike {
  path: string;
  name: string;
  size: number;
}

export function createFileMeta(file: DroppedFileLike): FileMeta {
  return {
    path: file.path,
    name: file.name,
    extension: path.extname(file.name),
    size: file.size
  };
}

export function createFileDroppedEventFromFiles(files: DroppedFileLike[], action: FileAction): FileDroppedEvent {
  const meta = files.map(createFileMeta);
  return createFileDroppedEvent({
    source: 'desktop-pet',
    paths: meta.map((item) => item.path),
    action,
    meta
  });
}
```

- [ ] **Step 7: Create renderer CSS**

Create `src/renderer/styles.css`:

```css
html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  user-select: none;
}

.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px;
  box-sizing: border-box;
}

.speech-bubble {
  max-width: 280px;
  padding: 10px 14px;
  border-radius: 18px;
  color: #4b1f2f;
  background: rgba(255, 238, 244, 0.94);
  border: 1px solid rgba(255, 130, 160, 0.7);
  box-shadow: 0 8px 22px rgba(90, 20, 50, 0.22);
  font-size: 14px;
}

.pet-stage {
  position: relative;
  width: 180px;
  height: 230px;
  border: 0;
  background: transparent;
  cursor: pointer;
  -webkit-app-region: drag;
}

.pet-head {
  position: absolute;
  left: 35px;
  top: 8px;
  width: 110px;
  height: 95px;
  border-radius: 48% 48% 44% 44%;
  background: linear-gradient(135deg, #ff8a80, #ffccbc);
  box-shadow: inset -8px -8px 0 rgba(180, 50, 70, 0.18);
}

.pet-eye {
  position: absolute;
  top: 44px;
  width: 12px;
  height: 18px;
  border-radius: 50%;
  background: #2c1a24;
  animation: blink 5s infinite;
}

.pet-eye-left { left: 30px; }
.pet-eye-right { right: 30px; }

.pet-body {
  position: absolute;
  left: 48px;
  top: 92px;
  width: 84px;
  height: 112px;
  border-radius: 42px 42px 28px 28px;
  background: linear-gradient(180deg, #fff3f6, #ffb3c1);
  box-shadow: 0 12px 22px rgba(90, 20, 50, 0.18);
}

.pet-badge {
  position: absolute;
  left: 25px;
  top: 38px;
  color: #d84363;
  font-weight: 700;
}

.pet-state-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  color: rgba(80, 20, 45, 0.72);
  font-size: 12px;
}

.pet-idle-breathe { animation: breathe 3s ease-in-out infinite; }
.pet-thinking-pulse { animation: pulse 1.2s ease-in-out infinite; }
.pet-working-bounce,
.pet-coding-tap,
.pet-testing-watch { animation: bounce 0.8s ease-in-out infinite; }
.pet-reading-sway { animation: sway 1.4s ease-in-out infinite; }
.pet-victory-pop { animation: pop 0.7s ease-in-out infinite; }
.pet-sweat-shake { animation: shake 0.35s ease-in-out infinite; }
.pet-reach-out,
.pet-hug-file { animation: bounce 0.5s ease-in-out infinite; }
.pet-sleepy-nod { animation: nod 2s ease-in-out infinite; }
.pet-poke-screen { animation: poke 1s ease-in-out infinite; }
.pet-wave-in { animation: pop 0.8s ease-in-out infinite; }

.action-menu {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(40, 20, 30, 0.22);
  -webkit-app-region: no-drag;
}

.action-menu-title {
  color: #6d2438;
  font-size: 13px;
  font-weight: 700;
}

.action-menu button {
  border: 1px solid #ffc0cb;
  border-radius: 10px;
  background: #fff4f7;
  color: #6d2438;
  padding: 7px 10px;
  cursor: pointer;
}

@keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
@keyframes breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes nod { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(3deg); } }
@keyframes poke { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-6px); } }
```

- [ ] **Step 8: Run typecheck and start app**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run typecheck
npm run dev
```

Expected:

```text
Electron window appears near the bottom-right of the screen.
The window background is transparent.
A simple sample character and Chinese bubble are visible.
```

Stop the dev server from the terminal after manual confirmation.

- [ ] **Step 9: Update handoff and commit**

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成 React Renderer 桌宠界面。
- 桌宠显示 sample CSS character、中文气泡、状态标签和文件动作菜单。
- 下一步是补充文件投递单元测试并实现 Bridge 脚本。
```

Commit:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/renderer docs/handoff.md
git commit -m "feat: add renderer pet interface" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: File Drop Event Tests

**Files:**
- Create: `tests/file-drop.test.ts`
- Modify: `src/renderer/pet/fileDropEvent.ts`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Write file drop tests**

Create `tests/file-drop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFileDroppedEventFromFiles, createFileMeta } from '../src/renderer/pet/fileDropEvent';

describe('file drop event helper', () => {
  it('creates file metadata from dropped files', () => {
    const meta = createFileMeta({
      path: 'C:/Users/yuan/Desktop/example.pdf',
      name: 'example.pdf',
      size: 2048
    });

    expect(meta).toEqual({
      path: 'C:/Users/yuan/Desktop/example.pdf',
      name: 'example.pdf',
      extension: '.pdf',
      size: 2048
    });
  });

  it('creates file.dropped events for multiple files', () => {
    const event = createFileDroppedEventFromFiles(
      [
        { path: 'C:/a.txt', name: 'a.txt', size: 1 },
        { path: 'C:/b.md', name: 'b.md', size: 2 }
      ],
      'record_only'
    );

    expect(event.type).toBe('file.dropped');
    expect(event.payload.paths).toEqual(['C:/a.txt', 'C:/b.md']);
    expect(event.payload.action).toBe('record_only');
    expect(event.payload.meta).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run file drop tests**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/file-drop.test.ts
npm run typecheck
```

Expected:

```text
PASS tests/file-drop.test.ts
```

If TypeScript reports that `File.path` does not exist in DOM types, update `src/renderer/pet/fileDropEvent.ts` and `src/renderer/App.tsx` to use this local type:

```ts
interface ElectronDroppedFile extends File {
  path: string;
}
```

Then cast inside `App.tsx`:

```ts
const files = Array.from(event.dataTransfer.files) as ElectronDroppedFile[];
```

Run the same checks again.

- [ ] **Step 3: Manually verify file drop**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run dev
```

Manual steps:

1. Drag one harmless text file onto the pet.
2. Confirm the bubble says it received the file.
3. Click `只记录路径`.
4. Stop the dev server.
5. Inspect `events/outbox.jsonl`.

Expected `events/outbox.jsonl` contains one line with:

```json
{"source":"desktop-pet","type":"file.dropped"}
```

The exact `id`, `time`, and path values will differ.

- [ ] **Step 4: Update handoff and commit**

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已验证文件投递 helper。
- 手动文件拖拽应写入 `events/outbox.jsonl`。
- 下一步是 Claude Code Bridge 脚本。
```

Commit:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add tests/file-drop.test.ts src/renderer/pet/fileDropEvent.ts src/renderer/App.tsx docs/handoff.md
git commit -m "feat: add file drop event handling" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Bridge Emit, Hook Mapping, and Outbox Watcher

**Files:**
- Create: `src/bridge/emitEvent.ts`
- Create: `src/bridge/claudeHook.ts`
- Create: `src/bridge/watchOutbox.ts`
- Create: `tests/claude-hook.test.ts`
- Modify: `docs/event-protocol.md`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Write hook mapping tests**

Create `tests/claude-hook.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapHookInputToState } from '../src/bridge/claudeHook';

describe('claude hook mapping', () => {
  it('maps read tools to reading', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Read' })).toEqual({
      state: 'reading',
      message: '正在读资料'
    });
  });

  it('maps edit tools to coding', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Edit' })).toEqual({
      state: 'coding',
      message: '正在修改代码'
    });
  });

  it('maps test bash commands to testing', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Bash', tool_input: { command: 'npm test' } })).toEqual({
      state: 'testing',
      message: '正在跑测试'
    });
  });

  it('maps session start to startup', () => {
    expect(mapHookInputToState('session-start', {})).toEqual({
      state: 'startup',
      message: 'Claude Code 启动啦'
    });
  });

  it('maps failed post tool use to error', () => {
    expect(mapHookInputToState('post-tool-use', { error: 'failed' })).toEqual({
      state: 'error',
      message: '工具执行出错了'
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/claude-hook.test.ts
```

Expected:

```text
FAIL tests/claude-hook.test.ts
Cannot find module '../src/bridge/claudeHook'
```

- [ ] **Step 3: Implement hook mapping and command entry**

Create `src/bridge/claudeHook.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { appendJsonLine } from '../shared/jsonl';
import { createPetStateEvent, type PetState } from '../shared/eventTypes';
import { getEventPaths } from '../shared/paths';
import { logLine } from '../shared/logger';

interface HookStateResult {
  state: PetState;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function commandContainsTest(command: string): boolean {
  return /\b(test|vitest|jest|pytest|build|lint|typecheck)\b/i.test(command);
}

export function mapHookInputToState(hookName: string, input: unknown): HookStateResult {
  const record = asRecord(input);

  if (hookName === 'session-start') {
    return { state: 'startup', message: 'Claude Code 启动啦' };
  }

  if (hookName === 'post-tool-use' && (record.error || record.is_error)) {
    return { state: 'error', message: '工具执行出错了' };
  }

  if (hookName === 'post-tool-use') {
    return { state: 'thinking', message: '工具执行完成，继续分析' };
  }

  const toolName = String(record.tool_name || record.toolName || '');
  if (['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'].includes(toolName)) {
    return { state: 'reading', message: '正在读资料' };
  }

  if (['Edit', 'Write', 'NotebookEdit'].includes(toolName)) {
    return { state: 'coding', message: '正在修改代码' };
  }

  if (toolName === 'Bash') {
    const toolInput = asRecord(record.tool_input || record.toolInput);
    const command = String(toolInput.command || '');
    if (commandContainsTest(command)) {
      return { state: 'testing', message: '正在跑测试' };
    }
    return { state: 'tool_running', message: '正在执行命令' };
  }

  if (hookName === 'stop') {
    return { state: 'waiting_user', message: '我等你下一步指示' };
  }

  return { state: 'tool_running', message: '正在处理任务' };
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function readInputFromArgOrStdin(): Promise<unknown> {
  const inputPath = process.argv[3];
  const raw = inputPath ? await readFile(inputPath, 'utf8') : await readStdin();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export async function runClaudeHook(): Promise<void> {
  const hookName = process.argv[2] || 'session-start';
  const paths = getEventPaths();

  try {
    const input = await readInputFromArgOrStdin();
    const mapped = mapHookInputToState(hookName, input);
    const event = createPetStateEvent({
      source: 'claude-code-hook',
      state: mapped.state,
      message: mapped.message,
      detail: { hookName }
    });
    await appendJsonLine(paths.inbox, event);
  } catch (error) {
    await logLine(paths.bridgeLog, `hook failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runClaudeHook().finally(() => process.exit(0));
}
```

- [ ] **Step 4: Implement emit command**

Create `src/bridge/emitEvent.ts`:

```ts
import { appendJsonLine } from '../shared/jsonl';
import { createPetStateEvent, PET_STATES, type PetState } from '../shared/eventTypes';
import { getEventPaths } from '../shared/paths';
import { getBubbleForState } from '../renderer/pet/personality';

function parseState(value: string | undefined): PetState {
  if (value && PET_STATES.includes(value as PetState)) {
    return value as PetState;
  }
  return 'thinking';
}

async function main(): Promise<void> {
  const state = parseState(process.argv[2]);
  const event = createPetStateEvent({
    source: 'emit-event',
    state,
    message: getBubbleForState(state)
  });
  await appendJsonLine(getEventPaths().inbox, event);
  console.log(`emitted ${state}: ${event.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 5: Implement outbox watcher**

Create `src/bridge/watchOutbox.ts`:

```ts
import { appendJsonLine, readJsonLines } from '../shared/jsonl';
import { isDesktopPetEvent } from '../shared/eventTypes';
import { getEventPaths } from '../shared/paths';

async function main(): Promise<void> {
  const paths = getEventPaths();
  const processed = await readJsonLines(paths.processed);
  const processedIds = new Set(
    processed
      .filter((item): item is { id: string } => typeof item === 'object' && item !== null && 'id' in item && typeof (item as { id: unknown }).id === 'string')
      .map((item) => item.id)
  );

  const outbox = await readJsonLines(paths.outbox);
  for (const item of outbox) {
    if (!isDesktopPetEvent(item)) continue;
    if (item.type !== 'file.dropped') continue;
    if (processedIds.has(item.id)) continue;

    console.log('用户通过桌宠投递了文件：');
    for (const filePath of item.payload.paths) {
      console.log(`- ${filePath}`);
    }
    console.log(`动作：${item.payload.action}`);

    await appendJsonLine(paths.processed, { id: item.id, processedAt: new Date().toISOString() });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Run bridge tests and commands**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm test -- tests/claude-hook.test.ts
npm run typecheck
npm run emit -- coding
npm run bridge:hook -- session-start
```

Expected:

```text
PASS tests/claude-hook.test.ts
emitted coding: evt_state_...
```

Inspect `events/inbox.jsonl` and confirm it contains `coding` and `startup` events.

- [ ] **Step 7: Update docs and commit**

Append to `docs/event-protocol.md`:

```markdown

## Bridge 命令

开发期状态模拟：

```bash
npm run emit -- coding
```

Claude Code hook 入口：

```bash
npm run bridge:hook -- session-start
npm run bridge:hook -- pre-tool-use
npm run bridge:hook -- post-tool-use
npm run bridge:hook -- stop
```

读取桌宠文件投递事件：

```bash
npm run bridge:watch-outbox
```
```

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成 Bridge 状态模拟、Claude hook 状态映射和 outbox watcher。
- 下一步是 hook 安装/卸载脚本和端到端手动验证。
```

Commit:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add src/bridge tests/claude-hook.test.ts docs/event-protocol.md docs/handoff.md
git commit -m "feat: add claude code bridge scripts" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Hook Helper Scripts and Documentation

**Files:**
- Create: `scripts/install-claude-hook.ps1`
- Create: `scripts/uninstall-claude-hook.ps1`
- Modify: `README.md`
- Modify: `docs/handoff.md`
- Modify: `docs/mvp-roadmap.md`

- [ ] **Step 1: Create install helper script**

Create `scripts/install-claude-hook.ps1`:

```powershell
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
```

- [ ] **Step 2: Create uninstall helper script**

Create `scripts/uninstall-claude-hook.ps1`:

```powershell
param(
  [string]$SettingsPath = "$HOME\.claude\settings.local.json"
)

Write-Host "Open this settings file and remove the Claude Code Desktop Pet hook command:"
Write-Host $SettingsPath
Write-Host "No files were changed by this script."
```

- [ ] **Step 3: Update README with usage**

Append to `README.md`:

```markdown

## 手动运行 MVP

```bash
npm run dev
```

另开一个终端写入状态事件：

```bash
npm run emit -- thinking
npm run emit -- coding
npm run emit -- success
npm run emit -- error
```

## 文件投递事件

拖文件到桌宠并选择动作后，事件写入：

```text
events/outbox.jsonl
```

读取未处理文件投递事件：

```bash
npm run bridge:watch-outbox
```

## Claude Code Hook

先打印建议 hook 命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-claude-hook.ps1
```

MVP 阶段脚本不会自动覆盖 Claude Code 设置文件。确认命令后，再由用户决定是否写入 `settings.local.json`。
```

- [ ] **Step 4: Update roadmap and handoff**

Update `docs/mvp-roadmap.md` Phase 5 section to include:

```markdown
当前策略：安装脚本先打印建议命令，不自动改写 Claude Code 设置文件。等用户明确授权后，再把 hook 写入设置。
```

Update `docs/handoff.md`:

```markdown
## 当前实现状态

- 已完成 hook 安装/卸载辅助脚本。
- 脚本只打印说明，不自动修改 Claude Code 设置，避免误改全局配置。
- 下一步是完整验证和打包配置。
```

- [ ] **Step 5: Run script smoke check**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
powershell -ExecutionPolicy Bypass -File scripts/install-claude-hook.ps1
powershell -ExecutionPolicy Bypass -File scripts/uninstall-claude-hook.ps1
```

Expected:

```text
Scripts print instructions and do not modify settings files.
```

- [ ] **Step 6: Commit hook scripts**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add scripts README.md docs/handoff.md docs/mvp-roadmap.md
git commit -m "docs: add claude hook helper scripts" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: End-to-End Verification and Packaging Baseline

**Files:**
- Modify: `docs/handoff.md`
- Modify: `docs/mvp-roadmap.md`
- Modify: `README.md`

- [ ] **Step 1: Run full automated checks**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run typecheck
npm test
npm run build
```

Expected:

```text
TypeScript passes.
Vitest passes all tests.
electron-vite build completes.
```

If any command fails, keep this task open, paste the exact failure into `docs/handoff.md`, and fix the failing task before continuing.

- [ ] **Step 2: Verify manual desktop behavior**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run dev
```

Manual checks:

1. Pet window appears near the bottom-right.
2. Window background is transparent.
3. Tray menu appears and can hide/show/reload/quit.
4. `npm run emit -- thinking` changes the displayed state.
5. `npm run emit -- coding` changes the displayed state.
6. Dragging a harmless local file shows the action menu.
7. Choosing `只记录路径` appends a `file.dropped` event to `events/outbox.jsonl`.
8. Quitting from tray closes the app.

- [ ] **Step 3: Verify outbox watcher**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run bridge:watch-outbox
```

Expected:

```text
The command prints file paths from unprocessed file.dropped events and records processed ids in events/processed.jsonl.
```

- [ ] **Step 4: Verify package command**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
npm run package
```

Expected:

```text
A Windows portable package is created under release/.
```

If packaging fails because electron-builder needs additional Windows tooling, record the exact error in `docs/handoff.md` and keep Phase 6 marked partial.

- [ ] **Step 5: Update final MVP docs**

Update `docs/handoff.md` with:

```markdown
## 当前实现状态

- MVP 自动测试状态：填写本轮 `npm run typecheck`、`npm test`、`npm run build` 的结果。
- MVP 人工验证状态：填写桌宠显示、状态切换、拖文件、托盘、outbox watcher 的结果。
- 打包状态：填写 `npm run package` 的结果。

## 下一步建议

- 如果 MVP 验证通过，下一阶段可以接入用户确认后的 Claude Code SessionStart hook。
- 如果用户提供角色素材，可以替换 sample CSS character 为 PNG/GIF/序列帧资源。
- 如果 Electron 占用不可接受，再评估 Tauri 迁移。
```

Update `docs/mvp-roadmap.md` with checked phase statuses in plain text:

```markdown
## 当前阶段状态

- Phase 0：完成或部分完成，按实际结果填写。
- Phase 1：完成或部分完成，按实际结果填写。
- Phase 2：完成或部分完成，按实际结果填写。
- Phase 3：完成或部分完成，按实际结果填写。
- Phase 4：完成或部分完成，按实际结果填写。
- Phase 5：完成或部分完成，按实际结果填写。
- Phase 6：完成或部分完成，按实际结果填写。
```

Update `README.md` with the verified run commands and known limitations observed during manual testing.

- [ ] **Step 6: Commit verification docs**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet
git add docs/handoff.md docs/mvp-roadmap.md README.md
git commit -m "docs: record mvp verification status" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

### Spec coverage

- Windows Electron MVP: Tasks 0, 4, 5, 9.
- JSONL event bus: Tasks 1, 2, 4, 7.
- Status system and personality bubbles: Task 3 and Task 5.
- File dragging and action menu: Tasks 5 and 6.
- Claude Code Bridge and hook mapping: Tasks 7 and 8.
- Documentation handoff requirement: every task includes `docs/handoff.md` updates; Task 9 finalizes verification.
- Safety boundaries: file actions only write events; hook helper scripts do not overwrite settings.

### Type consistency

- `PetState`, `FileAction`, `DesktopPetEvent`, `FileDroppedEvent`, and `createFileDroppedEvent` are defined in Task 1 and reused consistently.
- `MainEventBus.appendOutbox` accepts `DesktopPetEvent`, while IPC only allows `file.dropped` events.
- Renderer uses `createFileDroppedEventFromFiles` to produce the same event type used by bridge scripts.

### Execution warning

This plan intentionally keeps hook installation non-destructive. A later implementation agent must ask the user before modifying Claude Code settings files, because that changes future Claude Code startup behavior.
