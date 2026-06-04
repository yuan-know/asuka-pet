import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopPetEvent, FileDroppedEvent } from '../shared/eventTypes';

export interface DesktopPetApi {
  onEvent(callback: (event: DesktopPetEvent) => void): () => void;
  appendOutbox(event: FileDroppedEvent): Promise<void>;
}

const api: DesktopPetApi = {
  onEvent(callback) {
    const listener = (_: Electron.IpcRendererEvent, event: DesktopPetEvent) => callback(event);
    ipcRenderer.on('desktop-pet:event', listener);
    return () => ipcRenderer.removeListener('desktop-pet:event', listener);
  },
  appendOutbox(event) {
    return ipcRenderer.invoke('desktop-pet:append-outbox', event);
  }
};

contextBridge.exposeInMainWorld('desktopPet', api);
