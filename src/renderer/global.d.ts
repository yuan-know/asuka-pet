import type { DesktopPetEvent, FileDroppedEvent, FileMeta } from '../shared/eventTypes';

interface DesktopPetApi {
  onEvent(callback: (event: DesktopPetEvent) => void): () => void;
  appendOutbox(event: FileDroppedEvent): Promise<void>;
  readFileContent(filePath: string): Promise<{ content?: string; contentType?: string; encoding?: string; error?: string }>;
  enrichFileMetas(files: Array<{ path: string; name: string; size: number }>): Promise<FileMeta[]>;
  getPetImage(spriteName: string): Promise<string>;
  showClaudeTerminal(): Promise<void>;
  moveWindowBy(dx: number, dy: number): Promise<void>;
  dragStart(): Promise<void>;
  dragEnd(): Promise<void>;
  resizeWindow(w: number, h: number): Promise<void>;
  enableFullInteraction(): Promise<void>;
  restorePassthrough(): Promise<void>;
  setPassthrough(passthrough: boolean): Promise<void>;
}

declare global {
  interface Window {
    desktopPet: DesktopPetApi;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.png?url' {
  const src: string;
  export default src;
}
declare module '*.png?inline' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}

export {};
