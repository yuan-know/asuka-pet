export const PET_STATES = [
  'startup',
  'idle',
  'thinking',
  'tool_running',
  'reading',
  'coding',
  'testing',
  'waiting_user',
  'success',
  'error',
  'file_hover',
  'file_received',
  'sleepy'
] as const;

export type PetState = (typeof PET_STATES)[number];

export const FILE_ACTIONS = [
  'send_to_claude',
  'add_to_project_context',
  'record_only',
  'cancel'
] as const;

export type FileAction = (typeof FILE_ACTIONS)[number];

export interface DesktopPetEventBase<TType extends string, TPayload> {
  id: string;
  time: string;
  source: string;
  type: TType;
  payload: TPayload;
}

export interface PetStatePayload {
  state: PetState;
  message: string;
  detail?: Record<string, unknown>;
}

export interface FileMeta {
  path: string;
  name: string;
  extension: string;
  size: number;
}

export interface FileDroppedPayload {
  paths: string[];
  action: FileAction;
  meta: FileMeta[];
}

export type PetStateEvent = DesktopPetEventBase<'pet.state', PetStatePayload>;
export type FileDroppedEvent = DesktopPetEventBase<'file.dropped', FileDroppedPayload>;
export type DesktopPetEvent = PetStateEvent | FileDroppedEvent;

export function createEventId(prefix = 'evt'): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export function createPetStateEvent(input: {
  source: string;
  state: PetState;
  message: string;
  detail?: Record<string, unknown>;
}): PetStateEvent {
  return {
    id: createEventId('evt_state'),
    time: new Date().toISOString(),
    source: input.source,
    type: 'pet.state',
    payload: {
      state: input.state,
      message: input.message,
      detail: input.detail
    }
  };
}

export function createFileDroppedEvent(input: {
  source: string;
  paths: string[];
  action: FileAction;
  meta: FileMeta[];
}): FileDroppedEvent {
  return {
    id: createEventId('evt_file'),
    time: new Date().toISOString(),
    source: input.source,
    type: 'file.dropped',
    payload: {
      paths: input.paths,
      action: input.action,
      meta: input.meta
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPetState(value: unknown): value is PetState {
  return typeof value === 'string' && PET_STATES.includes(value as PetState);
}

function isFileAction(value: unknown): value is FileAction {
  return typeof value === 'string' && FILE_ACTIONS.includes(value as FileAction);
}

function isFileMeta(value: unknown): value is FileMeta {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.name === 'string' &&
    typeof value.extension === 'string' &&
    typeof value.size === 'number'
  );
}

export function isDesktopPetEvent(value: unknown): value is DesktopPetEvent {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.time !== 'string') return false;
  if (typeof value.source !== 'string') return false;
  if (!isRecord(value.payload)) return false;

  if (value.type === 'pet.state') {
    return isPetState(value.payload.state) && typeof value.payload.message === 'string';
  }

  if (value.type === 'file.dropped') {
    return (
      Array.isArray(value.payload.paths) &&
      value.payload.paths.every((item) => typeof item === 'string') &&
      isFileAction(value.payload.action) &&
      Array.isArray(value.payload.meta) &&
      value.payload.meta.every(isFileMeta)
    );
  }

  return false;
}
