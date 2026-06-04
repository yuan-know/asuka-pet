import { describe, expect, it } from 'vitest';
import { getBubbleForState } from '../src/renderer/pet/personality';
import { getStateConfig } from '../src/renderer/pet/states';
import { createInitialPetViewState, reducePetStateEvent, resolveTimedOutState } from '../src/renderer/pet/stateMachine';

describe('pet state configuration', () => {
  it('assigns higher priority to file_received than coding', () => {
    expect(getStateConfig('file_received').priority).toBeGreaterThan(getStateConfig('coding').priority);
  });

  it('has a Chinese bubble for coding', () => {
    expect(getBubbleForState('coding')).toContain('代码');
  });
});

describe('pet state machine', () => {
  it('starts idle', () => {
    expect(createInitialPetViewState().state).toBe('idle');
  });

  it('accepts higher priority incoming events', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'thinking',
      message: '让我想想',
      now: 1000
    });

    const next = reducePetStateEvent(current, {
      state: 'file_received',
      message: '收到文件',
      now: 2000
    });

    expect(next.state).toBe('file_received');
    expect(next.message).toBe('收到文件');
  });

  it('keeps higher priority state when lower priority event arrives quickly', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'error',
      message: '出错了',
      now: 1000
    });

    const next = reducePetStateEvent(current, {
      state: 'thinking',
      message: '思考中',
      now: 1500
    });

    expect(next.state).toBe('error');
    expect(next.message).toBe('出错了');
  });

  it('falls back to idle after timeout', () => {
    const current = reducePetStateEvent(createInitialPetViewState(), {
      state: 'success',
      message: '搞定',
      now: 1000
    });

    const next = resolveTimedOutState(current, 1000 + getStateConfig('success').timeoutMs + 1);
    expect(next.state).toBe('idle');
  });
});
