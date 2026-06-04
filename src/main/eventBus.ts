import { EventEmitter } from 'node:events';
import { appendJsonLine, readJsonLines } from '../shared/jsonl';
import { getEventPaths } from '../shared/paths';
import { isDesktopPetEvent, type DesktopPetEvent } from '../shared/eventTypes';

export class MainEventBus extends EventEmitter {
  private seenIds = new Set<string>();
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly projectRoot?: string) {
    super();
  }

  startPolling(intervalMs = 800): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), intervalMs);
    void this.poll();
  }

  stopPolling(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async appendOutbox(event: DesktopPetEvent): Promise<void> {
    const paths = getEventPaths(this.projectRoot);
    await appendJsonLine(paths.outbox, event);
  }

  async poll(): Promise<void> {
    const paths = getEventPaths(this.projectRoot);
    const lines = await readJsonLines(paths.inbox);
    for (const line of lines) {
      if (!isDesktopPetEvent(line)) continue;
      if (this.seenIds.has(line.id)) continue;
      this.seenIds.add(line.id);
      this.emit('event', line);
    }
  }
}
