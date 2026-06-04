import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

  it('returns null for missing session file', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);

    await expect(readClaudeSession(paths.session)).resolves.toBeNull();
  });

  it('returns null for invalid JSON in session file', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);

    await mkdir(path.dirname(paths.session), { recursive: true });
    await writeFile(paths.session, 'not json', 'utf8');
    await expect(readClaudeSession(paths.session)).resolves.toBeNull();
  });

  it('returns null for valid JSON with wrong shape', async () => {
    const root = await makeRoot();
    const paths = getEventPaths(root);

    await mkdir(path.dirname(paths.session), { recursive: true });
    await writeFile(paths.session, JSON.stringify({ foo: 1 }), 'utf8');
    await expect(readClaudeSession(paths.session)).resolves.toBeNull();
  });
});
