# MVP 路线图

## Phase 0：设计与项目初始化

产出：设计文档、README 初稿、handoff、git 初始化、Electron/TypeScript 基础结构。

验收：设计经用户确认，项目可安装依赖并 typecheck。

## Phase 1：透明桌宠窗口

产出：透明无边框窗口、置顶、占位角色、托盘退出/重载。

验收：`npm run dev` 后桌宠出现在桌面，背景透明，可退出。

## Phase 2：状态事件总线

产出：JSONL inbox、事件 schema、事件监听器、状态机、状态调试命令。

验收：`npm run emit -- thinking/coding/success/error` 能驱动状态变化。

## Phase 3：待机动作与人格气泡

产出：idle 随机动作、sleepy 长空闲动作、点击/悬停反馈、气泡模板。

验收：静置和点击时有可见反馈。

## Phase 4：文件拖拽交互

产出：文件 hover、drop 接收、动作菜单、`file.dropped` 事件写入。

验收：拖入单个/多个文件，outbox 内容正确。

## Phase 5：Claude Code Bridge

产出：hook 入口、状态映射、SessionStart 启动、outbox 监听。

验收：Claude Code 启动时桌宠出现或状态更新；hook 失败不阻塞 Claude Code。

## Phase 6：打包与交接

产出：Windows 打包配置、安装说明、hook 配置说明、完整 handoff。

验收：可从打包产物启动，并能关闭/卸载 hook。

当前策略：安装脚本先打印建议命令，不自动改写 Claude Code 设置文件。等用户明确授权后，再把 hook 写入设置。
