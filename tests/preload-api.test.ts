import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('desktopPet preload API source', () => {
  it('exposes setPassthrough through desktop-pet:set-passthrough IPC', () => {
    const source = readFileSync('src/preload/index.ts', 'utf8');

    expect(source).toContain('setPassthrough(passthrough: boolean)');
    expect(source).toContain("ipcRenderer.invoke('desktop-pet:set-passthrough', passthrough)");
  });
});
