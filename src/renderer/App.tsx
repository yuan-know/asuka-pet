import { useEffect, useMemo, useRef, useState } from 'react';
import type { FileAction } from '../shared/eventTypes';
import { createInitialPetViewState, reducePetStateEvent, resolveTimedOutState } from './pet/stateMachine';
import { getBubbleForState } from './pet/personality';
import { PetStage } from './components/PetStage';
import { ActionMenu } from './components/ActionMenu';
import { createFileDroppedEventFromFiles } from './pet/fileDropEvent';

const petApi = window.desktopPet;
const WIN_W = 160;
const WIN_H = 195;
const WIN_H_EXPANDED = 320; // tall enough for both pet and menu

if (!petApi) {
  console.warn('[desktop-pet] preload API not available — running in standalone mode');
}

export function App() {
  const [viewState, setViewState] = useState(() => createInitialPetViewState());
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const hasDroppedFiles = droppedFiles.length > 0;
  const resizedRef = useRef(false);

  // Expands/shrinks the window when file menu appears/dismisses.
  // Also controls mouse-event passthrough so menu buttons stay clickable.
  useEffect(() => {
    if (hasDroppedFiles && !resizedRef.current) {
      resizedRef.current = true;
      petApi?.resizeWindow(WIN_W, WIN_H_EXPANDED);
      petApi?.enableFullInteraction();
    } else if (!hasDroppedFiles && resizedRef.current) {
      resizedRef.current = false;
      petApi?.resizeWindow(WIN_W, WIN_H);
      petApi?.restorePassthrough();
    }
  }, [hasDroppedFiles]);

  useEffect(() => {
    if (!petApi) return;
    const unsubscribe = petApi.onEvent((event) => {
      if (event.type !== 'pet.state') return;
      setViewState((current) =>
        reducePetStateEvent(current, {
          state: event.payload.state,
          message: event.payload.message,
          now: Date.now()
        })
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setViewState((current) => resolveTimedOutState(current, Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dragHandlers = useMemo(
    () => ({
      onDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setViewState((current) =>
          reducePetStateEvent(current, {
            state: 'file_hover',
            message: getBubbleForState('file_hover'),
            now: Date.now()
          })
        );
      },
      onDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;
        setDroppedFiles(files);
        setViewState((current) =>
          reducePetStateEvent(current, {
            state: 'file_received',
            message: `收到 ${files.length} 个文件。`,
            now: Date.now()
          })
        );
      }
    }),
    []
  );

  async function handleAction(action: FileAction): Promise<void> {
    if (action !== 'cancel') {
      const filesForEvent = Array.from(droppedFiles).map((f) => ({
        path: (f as File & { path?: string }).path || f.name,
        name: f.name,
        size: f.size
      }));
      const event = createFileDroppedEventFromFiles(filesForEvent, action);
      if (petApi) {
        await petApi.appendOutbox(event);
      } else {
        console.log('[desktop-pet] file dropped (no-op, no preload):', event);
      }
    }
    setDroppedFiles([]);
  }

  function handlePetClick(): void {
    setViewState((current) =>
      reducePetStateEvent(current, {
        state: 'waiting_user',
        message: '喂，我在这呢。',
        now: Date.now()
      })
    );
    petApi?.showClaudeTerminal();
  }

  return (
    <div className="app" {...dragHandlers}>
      <div className="pet-area">
        <PetStage viewState={viewState} onPetClick={handlePetClick} />
        {hasDroppedFiles ? <ActionMenu fileCount={droppedFiles.length} onSelect={handleAction} /> : null}
      </div>
    </div>
  );
}
