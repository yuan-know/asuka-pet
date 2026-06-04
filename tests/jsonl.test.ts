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
