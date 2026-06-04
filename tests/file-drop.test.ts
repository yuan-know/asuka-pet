import { describe, expect, it } from 'vitest';
import { createFileDroppedEventFromFiles, createFileMeta } from '../src/renderer/pet/fileDropEvent';

describe('file drop event helper', () => {
  it('creates file metadata from dropped files', () => {
    const meta = createFileMeta({
      path: 'C:/Users/yuan/Desktop/example.pdf',
      name: 'example.pdf',
      size: 2048
    });

    expect(meta).toEqual({
      path: 'C:/Users/yuan/Desktop/example.pdf',
      name: 'example.pdf',
      extension: '.pdf',
      size: 2048
    });
  });

  it('creates file.dropped events for multiple files', () => {
    const event = createFileDroppedEventFromFiles(
      [
        { path: 'C:/a.txt', name: 'a.txt', size: 1 },
        { path: 'C:/b.md', name: 'b.md', size: 2 }
      ],
      'record_only'
    );

    expect(event.type).toBe('file.dropped');
    expect(event.payload.paths).toEqual(['C:/a.txt', 'C:/b.md']);
    expect(event.payload.action).toBe('record_only');
    expect(event.payload.meta).toHaveLength(2);
  });
});
