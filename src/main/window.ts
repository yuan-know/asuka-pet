import { BrowserWindow, screen } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';

const WIN_H_NORMAL = 195;
const WIN_H_EXPANDED = 320;

let hitTimer: ReturnType<typeof setInterval> | null = null;
let isDragging = false;

/**
 * Start polling cursor position every `intervalMs` (default 150ms).
 * Normal (small) window: only bubble+sprite area passes clicks; thin margins passthrough.
 * Expanded window: full area interactive (ActionMenu visible), no polling needed.
 */
export function startHitTest(browserWindow: BrowserWindow, intervalMs = 150): void {
  stopHitTest();

  const step = () => {
    if (browserWindow.isDestroyed()) { stopHitTest(); return; }
    if (isDragging) return;

    const [, h] = browserWindow.getSize();
    if (h >= WIN_H_EXPANDED) {
      if (!browserWindow.isDestroyed()) browserWindow.setIgnoreMouseEvents(false);
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const [wx, wy] = browserWindow.getPosition();
    const rx = cursor.x - wx;
    const ry = cursor.y - wy;
    const inside = rx >= 10 && rx <= 150 && ry >= 10 && ry <= 195;

    if (!browserWindow.isDestroyed()) {
      browserWindow.setIgnoreMouseEvents(!inside, { forward: true });
    }
  };

  // First call: enable mouse events so the window is immediately clickable
  if (!browserWindow.isDestroyed()) browserWindow.setIgnoreMouseEvents(false);
  // Then start passthrough polling
  hitTimer = setInterval(step, intervalMs);
}

export function stopHitTest(): void {
  if (hitTimer !== null) {
    clearInterval(hitTimer);
    hitTimer = null;
  }
}

/**
 * Force mouse events ON and stop hit-test polling.
 * Called when ActionMenu appears so buttons + drag work reliably.
 */
export function enableFullInteraction(browserWindow: BrowserWindow): void {
  stopHitTest();
  isDragging = false;
  if (!browserWindow.isDestroyed()) {
    browserWindow.setIgnoreMouseEvents(false);
  }
}

/**
 * Re-enable passthrough and restart hit-test polling.
 * Called when ActionMenu closes.
 */
export function restorePassthrough(browserWindow: BrowserWindow): void {
  startHitTest(browserWindow);
}

/** Called on mousedown in the renderer — force mouse events on during drag. */
export function setIsDragging(browserWindow: BrowserWindow, dragging: boolean): void {
  isDragging = dragging;
  if (!browserWindow.isDestroyed()) {
    browserWindow.setIgnoreMouseEvents(!dragging, { forward: true });
  }
}

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const width = 160;
  const height = WIN_H_NORMAL;
  const x = display.workArea.x + display.workArea.width - width - 60;
  const y = display.workArea.y + display.workArea.height - height - 100;

  const preloadCjs = path.resolve(__dirname, '../preload/index.cjs');
  const preloadJs = path.resolve(__dirname, '../preload/index.js');
  const preload = existsSync(preloadCjs) ? preloadCjs : preloadJs;

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
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.setAlwaysOnTop(true, 'floating');

  window.webContents.on('console-message', (_e, level, msg) => {
    const prefix = level === 2 ? '[renderer:warn]' : level === 3 ? '[renderer:error]' : '[renderer]';
    console.log(prefix, msg);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const rendererPath = path.resolve(__dirname, '../renderer/index.html');

  if (existsSync(rendererPath)) {
    void window.loadFile(rendererPath);
  } else if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    console.warn('[desktop-pet] No renderer found, trying http://localhost:5173');
    void window.loadURL('http://localhost:5173');
  }

  return window;
}
