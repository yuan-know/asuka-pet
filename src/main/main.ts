import { app, ipcMain } from 'electron';
import { MainEventBus } from './eventBus';
import { createPetTray } from './tray';
import { createPetWindow } from './window';
import { isDesktopPetEvent } from '../shared/eventTypes';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  const bus = new MainEventBus();

  app.whenReady().then(() => {
    const window = createPetWindow();
    createPetTray(window);

    bus.on('event', (event) => {
      window.webContents.send('desktop-pet:event', event);
    });
    bus.startPolling();

    ipcMain.handle('desktop-pet:append-outbox', async (_event, value) => {
      if (!isDesktopPetEvent(value) || value.type !== 'file.dropped') {
        throw new Error('Invalid outbox event');
      }
      await bus.appendOutbox(value);
    });
  });

  app.on('window-all-closed', () => {
    // Prevent app quit on window close (pet stays in tray)
  });

  app.on('before-quit', () => {
    bus.stopPolling();
  });
}
