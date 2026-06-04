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
        `Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id`,
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

export function createClaudeLifecycleMonitor(
  options: ClaudeLifecycleMonitorOptions
): { start: () => void; stop: () => void } {
  const intervalMs = options.intervalMs ?? 2000;
  const checkProcessAlive = options.isProcessAlive ?? isProcessAlive;
  let timer: NodeJS.Timeout | undefined;
  let checking = false;

  async function poll(): Promise<void> {
    if (checking) return;
    checking = true;
    try {
      const shouldQuit = await checkClaudeLifecycleOnce(
        options.projectRoot,
        checkProcessAlive
      );
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
    },
  };
}
