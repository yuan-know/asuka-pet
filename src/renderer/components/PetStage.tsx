import { useEffect, useState, useRef, useCallback } from 'react';
import type { PetViewState } from '../pet/stateMachine';
import { SpeechBubble } from './SpeechBubble';

interface PetStageProps {
  viewState: PetViewState;
  onPetClick: () => void;
}

export function PetStage({ viewState, onPetClick }: PetStageProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hovered, setHovered] = useState(false);
  const prevState = useRef('');
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    const spriteName = viewState.state;
    if (spriteName === prevState.current && imgSrc) return;
    prevState.current = spriteName;
    setImgSrc('');

    window.desktopPet?.getPetImage(spriteName)
      .then((dataUrl: string) => setImgSrc(dataUrl))
      .catch(() => {
        window.desktopPet?.getPetImage('idle')
          .then((dataUrl: string) => setImgSrc(dataUrl))
          .catch(() => { /* ignore */ });
      });
  }, [viewState.state]);

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
    <div className="pet-stage-wrapper" onMouseDown={onMouseDown}>
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
