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
