# 项目交接记录

更新时间：2026-06-04

## 当前状态

- Phase 0 已开始。
- npm 工具链计划使用 Electron、electron-vite、React、TypeScript、Vitest。
- 下一步是实现共享事件协议和 JSONL 工具。

## 当前实现状态

- 已完成共享事件协议：`src/shared/eventTypes.ts`。
- 已完成协议测试：`tests/event-protocol.test.ts`。
- 下一步是 JSONL 读写工具和事件路径工具。

## 用户明确要求

- 默认全程中文交流。
- 项目逻辑、计划、决策、进度必须实时写清楚。
- 用户可能因为 5 小时限额切换大模型，后续模型必须能通过文档继续。
- Windows 11 优先。
- 先做 MVP，让桌宠“活起来”。

## 已确认方案

- 技术栈：Electron + TypeScript。
- MVP 显示层：透明无边框桌宠窗口、占位角色素材、气泡、状态动画、托盘。
- MVP 联动层：JSONL 本地事件总线。
- MVP Bridge：先手动启动与状态模拟，稳定后接 Claude Code SessionStart hook。
- 文件交互：拖文件给桌宠后显示反馈、弹动作菜单、写入 outbox 事件。
- 角色素材：先占位，后续用户本地替换为 Q 版明日香方向私用素材。

## 关键文档

- 设计规格：`docs/superpowers/specs/2026-06-04-desktop-pet-design.md`
- 决策记录：`docs/decisions.md`
- 架构说明：`docs/architecture.md`
- 事件协议：`docs/event-protocol.md`
- 路线图：`docs/mvp-roadmap.md`

## 下一步

1. 等用户审阅并确认设计规格。
2. 通过 `superpowers:writing-plans` 制定实施计划。
3. 初始化 Electron + TypeScript 项目骨架。
4. 每完成阶段及时更新本文件。

## 注意事项

- 不要跳过设计审阅直接实现。
- 不要把关键决策只写在聊天里。
- hook 或桌宠失败不能影响 Claude Code 正常运行。
- 文件交互不能自动执行、删除、上传用户文件。

## 验证记录

### 2026-06-04 工具链基线验证

```bash
# typecheck 输出
> claude-code-desktop-pet@0.1.0 typecheck
> tsc --noEmit

# test 输出
> claude-code-desktop-pet@0.1.0 test
> vitest run

RUN  v4.1.8 C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp

No test files found, exiting with code 1

include: **/*.{test,spec}.?(c|m)[jt]s?(x)
exclude:  **/node_modules/**, **/.git/**
```

注：typecheck 通过（无 src 文件），vitest 无测试文件为预期行为。

