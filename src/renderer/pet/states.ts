import type { PetState } from '../../shared/eventTypes';

export interface PetStateConfig {
  state: PetState;
  animation: string;
  priority: number;
  timeoutMs: number;
}

export const PET_STATE_CONFIGS: Record<PetState, PetStateConfig> = {
  startup: { state: 'startup', animation: 'wave-in', priority: 60, timeoutMs: 5000 },
  idle: { state: 'idle', animation: 'idle-breathe', priority: 0, timeoutMs: 0 },
  thinking: { state: 'thinking', animation: 'thinking-pulse', priority: 40, timeoutMs: 15000 },
  tool_running: { state: 'tool_running', animation: 'working-bounce', priority: 50, timeoutMs: 12000 },
  reading: { state: 'reading', animation: 'reading-sway', priority: 52, timeoutMs: 12000 },
  coding: { state: 'coding', animation: 'coding-tap', priority: 55, timeoutMs: 12000 },
  testing: { state: 'testing', animation: 'testing-watch', priority: 56, timeoutMs: 15000 },
  waiting_user: { state: 'waiting_user', animation: 'poke-screen', priority: 20, timeoutMs: 10000 },
  success: { state: 'success', animation: 'victory-pop', priority: 70, timeoutMs: 7000 },
  error: { state: 'error', animation: 'sweat-shake', priority: 90, timeoutMs: 9000 },
  file_hover: { state: 'file_hover', animation: 'reach-out', priority: 80, timeoutMs: 3000 },
  file_received: { state: 'file_received', animation: 'hug-file', priority: 95, timeoutMs: 10000 },
  sleepy: { state: 'sleepy', animation: 'sleepy-nod', priority: 5, timeoutMs: 0 }
};

export function getStateConfig(state: PetState): PetStateConfig {
  return PET_STATE_CONFIGS[state];
}
