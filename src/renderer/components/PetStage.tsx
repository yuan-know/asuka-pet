import { useEffect, useState, useRef, useCallback } from 'react';
import type { PetViewState } from '../pet/stateMachine';
import { SpeechBubble } from './SpeechBubble';

interface PetStageProps {
  viewState: PetViewState;
  onPetClick: () => void;
  isMenuOpen: boolean;
}

export function PetStage({ viewState, onPetClick, isMenuOpen }: PetStageProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hovered, setHovered] = useState(false);
  const prevState = useRef('');
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMenuOpenRef = useRef(false);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    const spriteName = viewState.state;
    if (spriteName === prevState.current && imgSrc) return;
    prevState.current = spriteName;
    setImgSrc('');

    window.desktopPet?.getPetImage(spriteName)
      .then((dataUrl: string) => {
        setImgSrc(dataUrl);
        const offscreen = document.createElement('canvas');
        const tempImg = new Image();
        tempImg.onload = () => {
          offscreen.width = tempImg.naturalWidth;
          offscreen.height = tempImg.naturalHeight;
          offscreen.getContext('2d')!.drawImage(tempImg, 0, 0);
          canvasRef.current = offscreen;
        };
        tempImg.src = dataUrl;
      })
      .catch(() => {
        window.desktopPet?.getPetImage('idle')
          .then((dataUrl: string) => {
            setImgSrc(dataUrl);
            const offscreen = document.createElement('canvas');
            const tempImg = new Image();
            tempImg.onload = () => {
              offscreen.width = tempImg.naturalWidth;
              offscreen.height = tempImg.naturalHeight;
              offscreen.getContext('2d')!.drawImage(tempImg, 0, 0);
              canvasRef.current = offscreen;
            };
            tempImg.src = dataUrl;
          })
          .catch(() => { /* ignore */ });
      });
  }, [viewState.state]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isMenuOpenRef.current) {
        window.desktopPet?.setPassthrough(false);
        return;
      }
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        window.desktopPet?.setPassthrough(false);
        return;
      }

      const wrapperRect = wrapper.getBoundingClientRect();
      if (
        e.clientX < wrapperRect.left ||
        e.clientY < wrapperRect.top ||
        e.clientX >= wrapperRect.right ||
        e.clientY >= wrapperRect.bottom
      ) {
        window.desktopPet?.setPassthrough(true);
        return;
      }

      const canvas = canvasRef.current;
      const img = spriteRef.current;
      if (!canvas || !img) {
        window.desktopPet?.setPassthrough(false);
        return;
      }
      const rect = img.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) {
        window.desktopPet?.setPassthrough(true);
        return;
      }
      const px = Math.round((relX / rect.width) * canvas.width);
      const py = Math.round((relY / rect.height) * canvas.height);
      const alpha = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[3];
      window.desktopPet?.setPassthrough(alpha < 10);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current.dragging = true;
    dragRef.current.startX = e.screenX;
    dragRef.current.startY = e.screenY;
    window.desktopPet?.dragStart(); // force mouse events on for the drag

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.screenX - dragRef.current.startX;
      const dy = ev.screenY - dragRef.current.startY;
      dragRef.current.startX = ev.screenX;
      dragRef.current.startY = ev.screenY;
      window.desktopPet?.moveWindowBy(dx, dy);
    };

    const onMouseUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.desktopPet?.dragEnd(); // restore hit-test passthrough
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div className="pet-stage-wrapper" ref={wrapperRef} onMouseDown={onMouseDown}>
      <button
        className={`pet-stage pet-${viewState.animation}`}
        onClick={onPetClick}
        aria-label="Claude Code 桌宠"
      >
        <div
          className="pet-sprite-container"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.25s ease'
          }}
        >
          {imgSrc ? (
            <img
              className="pet-sprite"
              ref={spriteRef}
              src={imgSrc}
              alt={`明日香 - ${viewState.state}`}
              draggable={false}
            />
          ) : (
            <div className="pet-sprite-loading" />
          )}
        </div>
        <div className="pet-state-label">{viewState.state}</div>
      </button>
      <div className="pet-bubble-overlay">
        <SpeechBubble message={viewState.message} />
      </div>
    </div>
  );
}
