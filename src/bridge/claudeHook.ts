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

const isMainModule = process.argv[1]?.includes('claudeHook');

if (isMainModule) {
  runClaudeHook().finally(() => process.exit(0));
}
