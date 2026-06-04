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
