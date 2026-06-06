import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('main process passthrough IPC', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers desktop-pet:set-passthrough and forwards the value to the window helper', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const windowStub = {
      id: 'pet-window',
      webContents: { send: vi.fn() },
      getPosition: vi.fn(() => [0, 0]),
      setPosition: vi.fn(),
      isDestroyed: vi.fn(() => false),
      getSize: vi.fn(() => [160, 195]),
      setBounds: vi.fn()
    };
    const setMousePassthrough = vi.fn();

    vi.doMock('electron', () => ({
      app: {
        requestSingleInstanceLock: vi.fn(() => true),
        whenReady: vi.fn(() => Promise.resolve()),
        on: vi.fn(),
        getAppPath: vi.fn(() => '/app'),
        quit: vi.fn()
      },
      ipcMain: {
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
          handlers.set(channel, handler);
        })
      }
    }));

    vi.doMock('../src/main/eventBus', () => ({
      MainEventBus: vi.fn(function MainEventBus() {
        return {
          on: vi.fn(),
          startPolling: vi.fn(),
          stopPolling: vi.fn(),
          appendOutbox: vi.fn()
        };
      })
    }));

    vi.doMock('../src/main/tray', () => ({
      createPetTray: vi.fn()
    }));

    vi.doMock('../src/main/window', () => ({
      createPetWindow: vi.fn(() => windowStub),
      startHitTest: vi.fn(),
      stopHitTest: vi.fn(),
      setIsDragging: vi.fn(),
      enableFullInteraction: vi.fn(),
      restorePassthrough: vi.fn(),
      setMousePassthrough
    }));

    vi.doMock('../src/main/fileReader', () => ({
      readFileContent: vi.fn(),
      enrichFileMetas: vi.fn()
    }));

    vi.doMock('../src/main/processMonitor', () => ({
      createClaudeLifecycleMonitor: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn()
      }))
    }));

    vi.doMock('../src/shared/eventTypes', () => ({
      isDesktopPetEvent: vi.fn(() => true)
    }));

    await import('../src/main/main');
    await Promise.resolve();

    const handler = handlers.get('desktop-pet:set-passthrough');
    expect(handler).toBeTypeOf('function');

    handler?.({}, true);

    expect(setMousePassthrough).toHaveBeenCalledWith(windowStub, true);
  });
});
