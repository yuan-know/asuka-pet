import { describe, expect, it, vi, afterEach } from 'vitest';
import { startHitTest, setMousePassthrough, stopHitTest } from '../src/main/window';

function createWindowStub() {
  return {
    isDestroyed: vi.fn(() => false),
    setIgnoreMouseEvents: vi.fn(),
  };
}

describe('window mouse passthrough', () => {
  afterEach(() => {
    stopHitTest();
    vi.restoreAllMocks();
  });

  it('initializes hit testing without starting coordinate polling', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const window = createWindowStub();

    startHitTest(window as never);

    expect(window.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('sets passthrough from renderer alpha sampling result', () => {
    const window = createWindowStub();

    setMousePassthrough(window as never, true);
    setMousePassthrough(window as never, false);

    expect(window.setIgnoreMouseEvents).toHaveBeenNthCalledWith(1, true, { forward: true });
    expect(window.setIgnoreMouseEvents).toHaveBeenNthCalledWith(2, false, { forward: true });
  });
});
