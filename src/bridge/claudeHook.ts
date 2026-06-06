import { readFile } from 'node:fs/promises';
import { appendJsonLine } from '../shared/jsonl';
import { createPetStateEvent, type PetState, type PetStatePayload } from '../shared/eventTypes';
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

function mapToolNameToState(toolName: string, toolInput: Record<string, unknown>): HookStateResult {
  if (['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'].includes(toolName)) {
    return { state: 'reading', message: '正在读资料' };
  }

  if (['Edit', 'Write', 'NotebookEdit'].includes(toolName)) {
    return { state: 'coding', message: '正在修改代码' };
  }

  if (toolName === 'Bash') {
    const command = String(toolInput.command || '');
    if (commandContainsTest(command)) {
      return { state: 'testing', message: '正在跑测试' };
    }
    return { state: 'tool_running', message: '正在执行命令' };
  }

  return { state: 'tool_running', message: '正在处理任务' };
}

function getToolName(record: Record<string, unknown>): string {
  return String(record.tool_name || record.toolName || '');
}

function getToolInput(record: Record<string, unknown>): Record<string, unknown> {
  return asRecord(record.tool_input || record.toolInput);
}

export function mapHookInputToState(hookName: string, input: unknown): HookStateResult {
  const record = asRecord(input);

  if (hookName === 'session-start') {
    return { state: 'startup', message: 'Claude Code 启动啦' };
  }

  if (hookName === 'pre-tool-use') {
    const toolName = getToolName(record);
    const toolInput = getToolInput(record);
    return mapToolNameToState(toolName, toolInput);
  }

  if (hookName === 'post-tool-use') {
    if (record.error || record.is_error) {
      return { state: 'error', message: '工具执行出错了' };
    }
    return { state: 'thinking', message: '工具执行完成，继续分析' };
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

/**
 * 将 Claude Code 的 PascalCase 钩子名映射到 pet 事件名
 */
function normalizeHookName(raw: string): string {
  const map: Record<string, string> = {
    'session-start': 'session-start',
    'SessionStart': 'session-start',
    'SessionEnd': 'stop',
    'session-end': 'stop',
    'PreToolUse': 'pre-tool-use',
    'pre-tool-use': 'pre-tool-use',
    'PostToolUse': 'post-tool-use',
    'post-tool-use': 'post-tool-use',
    'PostToolUseFailure': 'post-tool-use',
    'Stop': 'stop',
    'UserPromptSubmit': 'thinking',
    'Resume': 'thinking',
  };
  return map[raw] || 'tool_running';
}

function getHookEventName(cliArg: string | undefined, input: Record<string, unknown>): string {
  // 优先从 stdin JSON 中的 hook_event_name 读取
  const fromStdin = String(input.hook_event_name || input.hookEventName || '');
  if (fromStdin) return normalizeHookName(fromStdin);
  // 回退到 CLI 参数
  return normalizeHookName(cliArg || 'session-start');
}

export async function runClaudeHook(): Promise<void> {
  const paths = getEventPaths();

  try {
    const inputRaw = await readInputFromArgOrStdin();
    const input = asRecord(inputRaw);
    const hookName = getHookEventName(process.argv[2], input);
    const mapped = mapHookInputToState(hookName, input);
    const event = createPetStateEvent({
      source: 'claude-code-hook',
      state: mapped.state,
      message: mapped.message,
      detail: { hookName }
    });
    await appendJsonLine(paths.inbox, event);

    // Claude Code hooks 需要输出 continue 信号
    const output = JSON.stringify({ continue: true });
    process.stdout.write(output + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logLine(paths.bridgeLog, `hook failed: ${message}`);
    // 即使失败也输出 continue，避免阻塞 Claude Code
    const output = JSON.stringify({ continue: true });
    process.stdout.write(output + '\n');
  }
}

const isMainModule = process.argv[1]?.includes('claudeHook');

if (isMainModule) {
  runClaudeHook();
}
