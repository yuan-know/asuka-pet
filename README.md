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

- Phase 0 正在进行：项目工具链与基础目录。
- 代码实现必须同步更新 `docs/handoff.md`。
