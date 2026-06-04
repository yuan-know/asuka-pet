import { appendJsonLine } from '../shared/jsonl';
import { createPetStateEvent, PET_STATES, type PetState } from '../shared/eventTypes';
import { getEventPaths } from '../shared/paths';
import { getBubbleForState } from '../renderer/pet/personality';

function parseState(value: string | undefined): PetState {
  if (value && PET_STATES.includes(value as PetState)) {
    return value as PetState;
  }
  return 'thinking';
}

async function main(): Promise<void> {
  const state = parseState(process.argv[2]);
  const event = createPetStateEvent({
    source: 'emit-event',
    state,
    message: getBubbleForState(state)
  });
  await appendJsonLine(getEventPaths().inbox, event);
  console.log(`emitted ${state}: ${event.id}`);
}

const isMainModule = process.argv[1]?.includes('emitEvent');

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
