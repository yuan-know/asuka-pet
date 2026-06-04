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
