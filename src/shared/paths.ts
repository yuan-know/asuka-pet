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
