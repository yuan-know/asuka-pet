# 决策记录

## 2026-06-04：Windows 优先

决定：第一版优先支持 Windows 11。

原因：用户当前环境是 Windows 11，目标是桌面常驻桌宠，优先服务当前使用场景。

## 2026-06-04：使用 Electron + TypeScript

决定：MVP 使用 Electron + TypeScript，而不是 Tauri、Python Qt 或 C# WPF。

原因：Electron 在透明窗口、托盘、拖拽、前端动画、Node/Claude Code 生态集成方面落地最快。MVP 目标是先形成可见闭环，而不是极致轻量。

## 2026-06-04：MVP 使用占位素材

决定：第一版使用占位 Q 版角色素材，后续支持用户替换私用素材。

原因：避免美术素材阻塞工程闭环，也明确公开发布时需注意版权边界。

## 2026-06-04：事件总线先用 JSONL

决定：第一版使用 `events/inbox.jsonl` 和 `events/outbox.jsonl` 作为本地事件队列。

原因：简单、可调试、跨进程稳定，适合 hook 和桌宠解耦。后续如需更高实时性可升级 WebSocket。

## 2026-06-04：开发期先手动启动，再接 SessionStart hook

决定：先实现 `npm run dev` 和状态模拟命令，稳定后再接 Claude Code `SessionStart` hook。

原因：降低初期调试复杂度，避免 hook 配置问题拖慢 MVP。

## 2026-06-04：文档实时交接是项目约束

决定：关键逻辑、计划、决策、进度必须写入文档。

原因：用户可能因 5 小时限额切换大模型，文档是跨模型交接机制。
