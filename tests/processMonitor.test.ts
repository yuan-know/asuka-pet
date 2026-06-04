import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEventPaths } from '../src/shared/paths';
import { writeClaudeSession } from '../src/shared/session';
import {
  checkClaudeLifecycleOnce,
  createClaudeLifecycleMonitor,
} from '../src/main/processMonitor';

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
      updatedAt: '2026-06-04T00:00:00.000Z',
    });

    const shouldQuit = await checkClaudeLifecycleOnce(
      root,
      async (pid) => pid === 12345
    );

    expect(shouldQuit).toBe(false);
  });

  it('quits the pet when the Claude PID is gone', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);
    await writeClaudeSession(paths.session, {
      claudePid: 12345,
      startedAt: '2026-06-04T00:00:00.000Z',
      updatedAt: '2026-06-04T00:00:00.000Z',
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
      onQuit,
    });

    monitor.start();
    monitor.start();
    monitor.stop();
    monitor.stop();

    expect(onQuit).not.toHaveBeenCalled();
  });
});
