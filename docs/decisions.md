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

## 2026-06-04：tsconfig moduleResolution 改为 bundler

决定：将 `tsconfig.json` 中的 `moduleResolution` 从计划的 `"Node"` 改为 `"bundler"`。

原因：electron-vite 和 Vite 生态系统期望使用 bundler 风格的模块解析，这样可以正确解析 `@vitejs/plugin-react` 等依赖的类型定义。

## 2026-06-04：npm install 使用 --legacy-peer-deps

决定：Task 0 依赖安装时使用了 `npm install --legacy-peer-deps`。

原因：最新版本的 `electron-vite`、`vite`、`vitest` 等包之间存在 peer dependency 冲突，使用 `--legacy-peer-deps` 可以在保持包版本为最新的同时完成安装。

## 2026-06-04: index.html 移至 src/renderer/

决定：将 `index.html` 从项目根目录移至 `src/renderer/index.html`，并更新 `electron.vite.config.ts` 中的 renderer input 路径。

原因：electron-vite 的 renderer build 无法正确处理项目根目录的 HTML 文件作为 entry（输出路径计算产生 `../../index.html` 非法相对路径）。移至 `src/renderer/` 后 build 正常。

## 2026-06-04: 移除 renderer 中的 node:path 依赖

决定：将 `src/renderer/pet/fileDropEvent.ts` 中的 `path.extname` 替换为纯字符串实现 `getExtension()`。

原因：Vite 将 `node:path` 外部化为浏览器兼容性模块，但 Electron renderer 在 contextIsolation 模式下无法使用 Node.js API。使用简单的 `lastIndexOf('.')` 实现避免该问题。
