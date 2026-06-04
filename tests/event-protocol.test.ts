import { describe, expect, it } from 'vitest';
import {
  createPetStateEvent,
  createFileDroppedEvent,
  isDesktopPetEvent,
  PET_STATES,
  FILE_ACTIONS
} from '../src/shared/eventTypes';

describe('desktop pet event protocol', () => {
  it('creates valid pet state events', () => {
    const event = createPetStateEvent({
      source: 'test',
      state: 'coding',
      message: '正在修改代码',
      detail: { tool: 'Edit', file: 'src/main.ts' }
    });

    expect(event.type).toBe('pet.state');
    expect(event.payload.state).toBe('coding');
    expect(event.payload.message).toBe('正在修改代码');
    expect(isDesktopPetEvent(event)).toBe(true);
  });

  it('creates valid file dropped events', () => {
    const event = createFileDroppedEvent({
      source: 'desktop-pet',
      paths: ['C:/Users/yuan/Desktop/example.pdf'],
      action: 'send_to_claude',
      meta: [
        {
          path: 'C:/Users/yuan/Desktop/example.pdf',
          name: 'example.pdf',
          extension: '.pdf',
          size: 2457600
        }
      ]
    });

    expect(event.type).toBe('file.dropped');
    expect(event.payload.paths).toEqual(['C:/Users/yuan/Desktop/example.pdf']);
    expect(event.payload.action).toBe('send_to_claude');
    expect(isDesktopPetEvent(event)).toBe(true);
  });

  it('rejects malformed events', () => {
    expect(isDesktopPetEvent({})).toBe(false);
    expect(isDesktopPetEvent({ type: 'pet.state' })).toBe(false);
    expect(isDesktopPetEvent({ id: 'x', time: 'x', source: 'x', type: 'bad', payload: {} })).toBe(false);
  });

  it('exports the expected state and action enums', () => {
    expect(PET_STATES).toContain('thinking');
    expect(PET_STATES).toContain('file_received');
    expect(FILE_ACTIONS).toContain('send_to_claude');
    expect(FILE_ACTIONS).toContain('record_only');
  });
});
