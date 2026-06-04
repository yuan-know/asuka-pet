import { app, ipcMain } from 'electron';
import { MainEventBus } from './eventBus';
import { createPetTray } from './tray';
import { createPetWindow } from './window';
import { isDesktopPetEvent } from '../shared/eventTypes';
import { readFileContent, enrichFileMetas } from './fileReader';
import { createClaudeLifecycleMonitor } from './processMonitor';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  const bus = new MainEventBus();
  const lifecycleMonitor = createClaudeLifecycleMonitor({ onQuit: () => app.quit() });

  app.whenReady().then(() => {
    const window = createPetWindow();
    createPetTray(window);

    bus.on('event', (event) => {
      window.webContents.send('desktop-pet:event', event);
    });
    bus.startPolling();
    lifecycleMonitor.start();

    ipcMain.handle('desktop-pet:append-outbox', async (_event, value) => {
      if (!isDesktopPetEvent(value) || value.type !== 'file.dropped') {
        throw new Error('Invalid outbox event');
      }
      await bus.appendOutbox(value);
    });

    // 多模态支持：读取单个文件内容
    ipcMain.handle('desktop-pet:read-file', async (_event, filePath: string) => {
      return readFileContent(filePath);
    });

    // 多模态支持：批量丰富文件元信息
    ipcMain.handle('desktop-pet:enrich-files', async (_event, files: Array<{ path: string; name: string; size: number }>) => {
      return enrichFileMetas(files);
    });

    // 桌宠精灵图片：从本地文件读取 PNG 并转为 base64 data URL
    ipcMain.handle('desktop-pet:get-pet-image', async (_event, spriteName: string) => {
      const mainDir = dirname(fileURLToPath(import.meta.url));
      const src = `${spriteName}.png`;
      const candidates = [
        join(mainDir, '..', '..', 'public', 'assets', 'pet', 'asuka', src),
        join(mainDir, 'public', 'assets', 'pet', 'asuka', src),
        join(app.getAppPath(), 'public', 'assets', 'pet', 'asuka', src),
        join(mainDir, '..', 'renderer', 'assets', src),       // Vite 打包后的位置
      ];
      let found: string | undefined;
      for (const p of candidates) {
        if (existsSync(p)) { found = p; break; }
      }
      if (!found) throw new Error(`Cannot find sprite: ${spriteName} (tried ${candidates.length} paths)`);
      const buf = readFileSync(found);
      return `data:image/png;base64,${buf.toString('base64')}`;
    });
  });

  app.on('window-all-closed', () => {
    // Prevent app quit on window close (pet stays in tray)
  });

  app.on('before-quit', () => {
    bus.stopPolling();
    lifecycleMonitor.stop();
  });
}
