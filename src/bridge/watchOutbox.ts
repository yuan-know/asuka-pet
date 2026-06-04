import { appendJsonLine, readJsonLines } from '../shared/jsonl';
import { isDesktopPetEvent } from '../shared/eventTypes';
import { getEventPaths } from '../shared/paths';

async function main(): Promise<void> {
  const paths = getEventPaths();
  const processed = await readJsonLines(paths.processed);
  const processedIds = new Set(
    processed
      .filter((item): item is { id: string } => typeof item === 'object' && item !== null && 'id' in item && typeof (item as { id: unknown }).id === 'string')
      .map((item) => item.id)
  );

  const outbox = await readJsonLines(paths.outbox);
  for (const item of outbox) {
    if (!isDesktopPetEvent(item)) continue;
    if (item.type !== 'file.dropped') continue;
    if (processedIds.has(item.id)) continue;

    console.log('用户通过桌宠投递了文件：');
    for (const filePath of item.payload.paths) {
      console.log(`- ${filePath}`);
    }
    console.log(`动作：${item.payload.action}`);

    await appendJsonLine(paths.processed, { id: item.id, processedAt: new Date().toISOString() });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
