# Claude Code Desktop Pet

一个 Windows 优先的 Claude Code 动态桌宠项目。目标是让桌宠随 Claude Code 启动，根据 Claude Code 工作状态切换动作和气泡，并支持用户拖拽文件给桌宠，由桌宠记录事件并交给 Claude Code Bridge 后续处理。

## 当前阶段

设计规格已完成，尚未开始代码实现。

请先阅读：

- `docs/handoff.md`
- `docs/superpowers/specs/2026-06-04-desktop-pet-design.md`
- `docs/decisions.md`
- `docs/event-protocol.md`
- `docs/mvp-roadmap.md`

## 关键约束

- 默认中文交流。
- Windows 11 优先。
- Electron + TypeScript MVP。
- 第一版使用占位素材，后续支持用户本地替换。
- 桌宠不能影响 Claude Code 正常运行。
- 文件交互不能自动执行、删除或上传文件。
- 所有关键进度必须写入文档，方便换模型继续。

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run emit -- thinking
```

## 当前实现状态

- Core MVP 实现进行中：Task 0-7 已全部完成（`[CORE]` 子任务）。
- 代码实现必须同步更新 `docs/handoff.md`。

## 手动运行 MVP

```bash
npm run dev
```

另开一个终端写入状态事件：

```bash
npm run emit -- thinking
npm run emit -- coding
npm run emit -- success
npm run emit -- error
```

## 文件投递事件

拖文件到桌宠并选择动作后，事件写入：

```text
events/outbox.jsonl
```

读取未处理文件投递事件：

```bash
npm run bridge:watch-outbox
```

## Claude Code Hook

先打印建议 hook 命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-claude-hook.ps1
```

MVP 阶段脚本不会自动覆盖 Claude Code 设置文件。确认命令后，再由用户决定是否写入 `settings.local.json`。
