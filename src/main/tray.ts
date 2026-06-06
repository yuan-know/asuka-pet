import { BrowserWindow, Menu, Tray, nativeImage, app } from 'electron';
import * as path from 'path';

let tray: Tray | undefined;

export function createPetTray(window: BrowserWindow): Tray {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'tray-icon.png')
    : path.join(__dirname, '..', '..', 'public', 'assets', 'tray-icon.png');
  const image = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 });
  tray = new Tray(image);
  tray.setToolTip('Claude Code Desktop Pet');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示桌宠', click: () => window.show() },
      { label: '隐藏桌宠', click: () => window.hide() },
      { label: '重新载入', click: () => window.reload() },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ])
  );
  return tray;
}

export function getPetTray(): Tray | undefined {
  return tray;
}
