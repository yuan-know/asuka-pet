/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  onEvent(callback: (event: unknown) => void) {
    const listener = (_event: unknown, event: unknown) => callback(event);
    ipcRenderer.on('desktop-pet:event', listener);
    return () => ipcRenderer.removeListener('desktop-pet:event', listener);
  },
  appendOutbox(event: unknown) {
    return ipcRenderer.invoke('desktop-pet:append-outbox', event);
  },
  readFileContent(filePath: string) {
    return ipcRenderer.invoke('desktop-pet:read-file', filePath);
  },
  enrichFileMetas(files: unknown[]) {
    return ipcRenderer.invoke('desktop-pet:enrich-files', files);
  },
  getPetImage(spriteName: string) {
    return ipcRenderer.invoke('desktop-pet:get-pet-image', spriteName);
  },
  showClaudeTerminal() {
    return ipcRenderer.invoke('desktop-pet:show-claude-terminal');
  },
  moveWindowBy(dx: number, dy: number) {
    return ipcRenderer.invoke('desktop-pet:move-window-by', dx, dy);
  },
  dragStart() {
    return ipcRenderer.invoke('desktop-pet:drag-start');
  },
  dragEnd() {
    return ipcRenderer.invoke('desktop-pet:drag-end');
  },
  resizeWindow(w: number, h: number) {
    return ipcRenderer.invoke('desktop-pet:resize-window', w, h);
  },
  enableFullInteraction() {
    return ipcRenderer.invoke('desktop-pet:enable-full-interaction');
  },
  restorePassthrough() {
    return ipcRenderer.invoke('desktop-pet:restore-passthrough');
  }
});
