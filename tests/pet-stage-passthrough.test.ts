import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PetStage pixel alpha passthrough source', () => {
  it('checks wrapper bounds before sampling sprite alpha from an offscreen canvas', () => {
    const source = readFileSync('src/renderer/components/PetStage.tsx', 'utf8');

    expect(source).toContain('const wrapperRef = useRef<HTMLDivElement>(null);');
    expect(source).toContain('const spriteRef = useRef<HTMLImageElement>(null);');
    expect(source).toContain('const canvasRef = useRef<HTMLCanvasElement | null>(null);');
    expect(source).toContain("const offscreen = document.createElement('canvas');");
    expect(source).toContain('offscreen.getContext(\'2d\')!.drawImage(tempImg, 0, 0);');
    expect(source).toContain('const wrapper = wrapperRef.current;');
    expect(source).toContain('const wrapperRect = wrapper.getBoundingClientRect();');
    expect(source).toContain('e.clientX < wrapperRect.left');
    expect(source).toContain('e.clientX >= wrapperRect.right');
    expect(source).toContain("window.addEventListener('mousemove', handleMouseMove);");
    expect(source).toContain("window.removeEventListener('mousemove', handleMouseMove);");
    expect(source).toContain("window.desktopPet?.setPassthrough(alpha < 10);");
    expect(source).toContain('ref={wrapperRef}');
    expect(source).toContain('ref={spriteRef}');
  });

  it('keeps the wrapper height constrained to its content', () => {
    const source = readFileSync('src/renderer/styles.css', 'utf8');

    expect(source).toMatch(/\.pet-stage-wrapper\s*\{[^}]*height:\s*fit-content;/s);
  });
});
