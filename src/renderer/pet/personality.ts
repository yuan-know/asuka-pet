import type { PetState } from '../../shared/eventTypes';

const BUBBLES: Record<PetState, string[]> = {
  startup: ['我来啦，今天也别拖后腿哦。'],
  idle: ['暂时没事？那我就盯着你啦。'],
  thinking: ['别催，我正在想。'],
  tool_running: ['工具启动，交给我盯着。'],
  reading: ['我在翻资料，别乱动。'],
  coding: ['代码这种程度，我当然能看懂。'],
  testing: ['测试中……最好一次过。'],
  waiting_user: ['喂，该你说话了。'],
  success: ['看吧，我说能搞定。'],
  error: ['哈？这不是我的问题吧……我再看看。'],
  file_hover: ['拿来吧，我接着。'],
  file_received: ['收到，我帮你记下来了。'],
  sleepy: ['再不动我就睡着了……']
};

export function getBubbleForState(state: PetState): string {
  return BUBBLES[state][0];
}
