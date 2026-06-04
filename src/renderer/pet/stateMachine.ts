import type { PetState } from '../../shared/eventTypes';
import { getBubbleForState } from './personality';
import { getStateConfig } from './states';

export interface PetViewState {
  state: PetState;
  animation: string;
  message: string;
  enteredAt: number;
}

export interface IncomingPetState {
  state: PetState;
  message?: string;
  now: number;
}

export function createInitialPetViewState(now = Date.now()): PetViewState {
  const config = getStateConfig('idle');
  return {
    state: 'idle',
    animation: config.animation,
    message: getBubbleForState('idle'),
    enteredAt: now
  };
}

export function reducePetStateEvent(current: PetViewState, incoming: IncomingPetState): PetViewState {
  const currentConfig = getStateConfig(current.state);
  const incomingConfig = getStateConfig(incoming.state);
  const currentTimedOut = resolveTimedOutState(current, incoming.now).state === 'idle';

  if (!currentTimedOut && incomingConfig.priority < currentConfig.priority) {
    return current;
  }

  return {
    state: incoming.state,
    animation: incomingConfig.animation,
    message: incoming.message || getBubbleForState(incoming.state),
    enteredAt: incoming.now
  };
}

export function resolveTimedOutState(current: PetViewState, now: number): PetViewState {
  const config = getStateConfig(current.state);
  if (config.timeoutMs === 0) return current;
  if (now - current.enteredAt <= config.timeoutMs) return current;
  return createInitialPetViewState(now);
}
