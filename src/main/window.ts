import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const width = 360;
  const height = 420;
  const x = display.workArea.x + display.workArea.width - width - 40;
  const y = display.workArea.y + display.workArea.height - height - 40;

  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.setAlwaysOnTop(true, 'floating');

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
}
