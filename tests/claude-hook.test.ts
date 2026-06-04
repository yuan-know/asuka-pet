import { describe, expect, it } from 'vitest';
import { mapHookInputToState } from '../src/bridge/claudeHook';

describe('claude hook mapping', () => {
  it('maps read tools to reading', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Read' })).toEqual({
      state: 'reading',
      message: '正在读资料'
    });
  });

  it('maps edit tools to coding', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Edit' })).toEqual({
      state: 'coding',
      message: '正在修改代码'
    });
  });

  it('maps test bash commands to testing', () => {
    expect(mapHookInputToState('pre-tool-use', { tool_name: 'Bash', tool_input: { command: 'npm test' } })).toEqual({
      state: 'testing',
      message: '正在跑测试'
    });
  });

  it('maps session start to startup', () => {
    expect(mapHookInputToState('session-start', {})).toEqual({
      state: 'startup',
      message: 'Claude Code 启动啦'
    });
  });

  it('maps failed post tool use to error', () => {
    expect(mapHookInputToState('post-tool-use', { error: 'failed' })).toEqual({
      state: 'error',
      message: '工具执行出错了'
    });
  });
});
