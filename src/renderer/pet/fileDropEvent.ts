import { createFileDroppedEvent, type FileAction, type FileDroppedEvent, type FileMeta } from '../../shared/eventTypes';

interface DroppedFileLike {
  path: string;
  name: string;
  size: number;
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(dotIndex) : '';
}

export function createFileMeta(file: DroppedFileLike): FileMeta {
  return {
    path: file.path,
    name: file.name,
    extension: getExtension(file.name),
    size: file.size
  };
}

export function createFileDroppedEventFromFiles(files: DroppedFileLike[], action: FileAction): FileDroppedEvent {
  const meta = files.map(createFileMeta);
  return createFileDroppedEvent({
    source: 'desktop-pet',
    paths: meta.map((item) => item.path),
    action,
    meta
  });
}
