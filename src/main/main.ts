import { app, ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { MainEventBus } from './eventBus';
import { createPetTray } from './tray';
import { createPetWindow, startHitTest, stopHitTest, setIsDragging,
  enableFullInteraction, restorePassthrough } from './window';
import { isDesktopPetEvent } from '../shared/eventTypes';
import { readFileContent, enrichFileMetas } from './fileReader';
import { createClaudeLifecycleMonitor } from './processMonitor';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  const bus = new MainEventBus();
  const lifecycleMonitor = createClaudeLifecycleMonitor({ onQuit: () => app.quit() });

  app.whenReady().then(() => {
    const window = createPetWindow();
    createPetTray(window);

    // Hit-test: automatically passthrough clicks outside the pet sprite/bubble area
    startHitTest(window);

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

    // 点击桌宠唤出 Claude Code 终端
    ipcMain.handle('desktop-pet:show-claude-terminal', async () => {
      try {
        // Use Win32 API to restore + foreground the window.
        // UIPI prevents low-integrity processes from SetForegroundWindow,
        // so we simulate Alt keypress to satisfy Windows foreground rules.
        const psScript = `
          $names = @("WindowsTerminal","WindowsTerminalPreview")
          foreach ($n in $names) {
            $proc = Get-Process $n -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
            if ($proc) {
              $sig = '[DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int s); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);'
              $t = Add-Type -MemberDefinition $sig -Name W -Namespace W -PassThru
              $h = $proc.MainWindowHandle
              if ([bool]$t::IsIconic($h)) { $t::ShowWindowAsync($h, 9) | Out-Null }
              # Alt key to allow foreground switch
              $wshell = New-Object -ComObject wscript.shell
              $wshell.SendKeys('%')
              Start-Sleep -Milliseconds 50
              $t::SetForegroundWindow($h) | Out-Null
              Start-Sleep -Milliseconds 300
              exit 0
            }
          }
          $proc = Get-Process claude -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
          if ($proc) {
            $sig = '[DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int s); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);'
            $t = Add-Type -MemberDefinition $sig -Name W -Namespace W -PassThru
            $h = $proc.MainWindowHandle
            if ([bool]$t::IsIconic($h)) { $t::ShowWindowAsync($h, 9) | Out-Null }
            $wshell = New-Object -ComObject wscript.shell
            $wshell.SendKeys('%')
            Start-Sleep -Milliseconds 50
            $t::SetForegroundWindow($h) | Out-Null
            Start-Sleep -Milliseconds 300
            exit 0
          }
          exit 1
        `;
        await execFileAsync('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], { timeout: 5000 });
      } catch {
        // Claude window might not exist
      }
    });

    // 拖拽桌宠窗口（替代 -webkit-app-region: drag，避免 Windows OS 层拦截鼠标事件）
    ipcMain.handle('desktop-pet:move-window-by', (_event, dx: number, dy: number) => {
      const [wx, wy] = window.getPosition();
      window.setPosition(wx + dx, wy + dy);
    });

    // 动态调整窗口大小（文件菜单出现时撑高，选择后恢复）
    ipcMain.handle('desktop-pet:resize-window', (_event, w: number, h: number) => {
      if (window.isDestroyed()) return;
      const [oldX, oldY] = window.getPosition();
      const [oldW, oldH] = window.getSize();
      // Keep bottom edge anchored: oldY + oldH = newY + h
      window.setBounds({ x: oldX, y: oldY + oldH - h, width: w, height: h });
    });

    // 文件菜单出现 → 关闭穿透 + 暂停轮询，让菜单和角色可交互
    ipcMain.handle('desktop-pet:enable-full-interaction', () => {
      enableFullInteraction(window);
    });

    // 文件菜单关闭 → 恢复穿透 + 重启轮询
    ipcMain.handle('desktop-pet:restore-passthrough', () => {
      restorePassthrough(window);
    });

    ipcMain.handle('desktop-pet:drag-start', () => {
      setIsDragging(window, true);
    });

    ipcMain.handle('desktop-pet:drag-end', () => {
      setIsDragging(window, false);
    });

    // 停止 hit-test 轮询（app 退出时）
    app.on('before-quit', () => {
      stopHitTest();
      bus.stopPolling();
      lifecycleMonitor.stop();
    });
  });

  app.on('window-all-closed', () => {
    // Prevent app quit on window close (pet stays in tray)
  });
}
