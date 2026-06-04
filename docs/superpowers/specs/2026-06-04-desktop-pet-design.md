# Claude Code Desktop Pet 设计规格

日期：2026-06-04  
项目名：`claude-code-desktop-pet`  
阶段：设计确认完成，等待用户审阅后进入实施计划

## 1. 项目目标

构建一个随 Claude Code 启动的 Windows 桌面动态桌宠。桌宠第一版采用 Q 版角色占位素材，后续支持用户本地替换为“Q 版明日香方向”的私用素材。桌宠需要根据 Claude Code 的不同工作状态呈现不同动作和气泡反馈，并支持用户把文件拖拽给她，由她进行可爱反馈、弹出动作菜单，并把文件事件可靠记录给 Claude Code Bridge 后续处理。

第一版的核心不是做完整虚拟人格，而是跑通以下闭环：

1. Claude Code 启动或手动启动桌宠；
2. 桌宠显示在 Windows 桌面上，透明、无边框、可常驻；
3. Claude Code 状态事件驱动桌宠动作变化；
4. 桌宠有待机动作和基础人格气泡；
5. 用户拖文件给桌宠，桌宠接收并记录事件；
6. 项目文档实时更新，方便 5 小时限额后换模型继续。

## 2. 已确认决策

- 沟通语言：默认全程中文。
- 平台优先级：Windows 11 优先。
- 开发策略：快速 MVP 优先，先活起来，再精细化。
- 技术栈：Electron + TypeScript。
- 角色素材：MVP 用占位素材；后续支持用户本地替换私用素材。
- Claude Code 集成：开发期先手动启动，稳定后接入 `SessionStart` hook。
- MVP 范围：透明桌宠窗口、待机动画、状态动画、气泡、拖文件反馈、简单动作菜单、托盘、事件队列、部分 Claude Code hook/bridge 联动。
- 文档要求：所有关键逻辑、计划、决策、进度必须写入项目文档，不能只存在聊天记录。

## 3. 总体架构

第一版采用 Electron 单体桌面应用，内部拆成三层。

### 3.1 桌宠显示层

职责：

- 透明无边框窗口；
- 角色贴图、序列帧或 CSS 占位动画；
- 待机动作；
- Claude Code 状态动作；
- 气泡文字；
- 文件拖拽反馈；
- 简单动作菜单；
- 托盘菜单。

MVP 不强制使用 Live2D。第一版优先用 PNG 序列帧、GIF 或 CSS 动画占位做出交互闭环。

### 3.2 本地事件总线层

职责：

- 接收 Claude Code Bridge 写入的状态事件；
- 接收桌宠写出的用户交互事件；
- 提供可调试、可追踪、可交接的事件日志。

MVP 采用 JSONL 文件队列：

- `events/inbox.jsonl`：Claude Code / Bridge → 桌宠；
- `events/outbox.jsonl`：桌宠 → Bridge / Claude Code；
- `events/processed.jsonl`：已处理事件记录，可选。

后续如果需要更实时体验，可升级为本地 WebSocket，但事件协议保持稳定。

### 3.3 Claude Code Bridge 层

职责：

- 开发期提供状态模拟命令；
- SessionStart 时启动桌宠或写入启动事件；
- 根据 Claude Code hook 输入映射状态；
- 读取桌宠投递的文件事件；
- 保证 hook 失败不影响 Claude Code 正常运行。

## 4. 数据流

```text
Claude Code
   │
   │ hooks/status bridge 写入事件
   ▼
本地事件总线 events/*.jsonl
   │
   │ Electron 主进程监听
   ▼
桌宠 Renderer
   │
   ├─ 切换动画
   ├─ 显示气泡
   ├─ 播放待机/工作动作
   └─ 接收拖拽文件
          │
          ▼
     写回 file.dropped 事件
          │
          ▼
     Claude Code Bridge 后续读取处理
```

## 5. 状态系统设计

MVP 采用“有限状态 + 优先级 + 气泡模板 + 简单动画映射”。

### 5.1 状态集合

| 状态 | 触发来源 | 桌宠表现 |
|---|---|---|
| `startup` | SessionStart / 手动启动 | 出现、挥手、问候 |
| `idle` | 无任务、等待事件 | 眨眼、晃腿、看屏幕 |
| `thinking` | Claude 正在分析/生成 | 托腮、盯屏幕、省略号 |
| `tool_running` | 工具调用 | 敲键盘、忙碌 |
| `reading` | Read/Grep/Glob/WebFetch 等 | 翻资料、拿放大镜 |
| `coding` | Edit/Write/NotebookEdit 等 | 打字、挥笔 |
| `testing` | test/build/lint 命令 | 紧张观察 |
| `waiting_user` | 等待用户输入 | 戳屏幕、提示气泡 |
| `success` | 任务完成/测试通过 | 得意、比耶、闪光 |
| `error` | 工具或命令失败 | 困惑、冒汗、吐槽 |
| `file_hover` | 文件拖到桌宠上方 | 伸手准备接 |
| `file_received` | 文件 drop 成功 | 抱住文件、弹菜单 |
| `sleepy` | 长时间空闲 | 打瞌睡、趴下 |

### 5.2 状态映射结构

```ts
{
  state: "thinking",
  animation: "think_loop",
  bubble: "让我想想……",
  priority: 40,
  timeoutMs: 15000
}
```

### 5.3 状态优先级

从高到低：

1. `error` / `file_received`；
2. `success`；
3. `coding` / `testing` / `tool_running`；
4. `thinking`；
5. `waiting_user`；
6. `idle` / `sleepy`。

### 5.4 待机动作

- 眨眼；
- 看左看右；
- 小幅呼吸；
- 坐下晃腿；
- 偶尔吐槽；
- 长时间无事件后进入 `sleepy`；
- 鼠标点击或悬停时有反馈。

## 6. 文件拖拽与交互设计

### 6.1 用户流程

```text
拖文件到桌宠附近
  ↓
桌宠进入 file_hover 状态
  ↓
用户松手 drop
  ↓
桌宠进入 file_received 状态
  ↓
显示接收动画 + 气泡
  ↓
弹出动作菜单
  ↓
用户选择动作
  ↓
写入 outbox 事件
  ↓
Claude Code Bridge 后续读取
```

### 6.2 MVP 动作菜单

| 动作 | 作用 |
|---|---|
| `send_to_claude` | 写入事件，提示 Claude Code 当前会话处理文件 |
| `add_to_project_context` | 登记或复制到项目资料目录，具体行为需用户确认后执行 |
| `record_only` | 只记录文件路径和元信息 |
| `cancel` | 取消该次投递 |

### 6.3 文件安全边界

MVP 不做以下行为：

- 不自动执行文件；
- 不自动删除或移动原文件；
- 不自动解压压缩包；
- 不自动上传外部服务；
- 不默认读取敏感文件内容；
- 复制文件到项目目录前必须有明确目标和用户意图。

## 7. 事件协议初稿

### 7.1 状态事件

```json
{
  "id": "evt_001",
  "time": "2026-06-04T10:30:00+08:00",
  "source": "claude-code-hook",
  "type": "pet.state",
  "payload": {
    "state": "coding",
    "message": "正在修改代码",
    "detail": {
      "tool": "Edit",
      "file": "src/main.ts"
    }
  }
}
```

### 7.2 文件投递事件

```json
{
  "id": "evt_file_001",
  "time": "2026-06-04T10:45:00+08:00",
  "source": "desktop-pet",
  "type": "file.dropped",
  "payload": {
    "paths": ["C:/Users/yuan/Desktop/example.pdf"],
    "action": "send_to_claude",
    "meta": [
      {
        "path": "C:/Users/yuan/Desktop/example.pdf",
        "name": "example.pdf",
        "extension": ".pdf",
        "size": 2457600
      }
    ]
  }
}
```

## 8. Claude Code Hook / Bridge 集成

### 8.1 阶段 A：开发期手动模式

提供：

```bash
npm run dev
npm run emit -- thinking
npm run emit -- coding
npm run emit -- success
npm run emit -- error
```

目标：先验证桌宠窗口、状态事件、动画、气泡、文件 outbox。

### 8.2 阶段 B：SessionStart 启动

稳定后接入 Claude Code hook。示意：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node C:/path/to/pet/dist/bridge/claudeHook.js session-start"
          }
        ]
      }
    ]
  }
}
```

`session-start` 需要：

1. 检查桌宠是否已启动；
2. 未启动则启动桌宠；
3. 写入 `startup` 状态事件；
4. 失败时记录日志但不阻塞 Claude Code。

### 8.3 状态映射

| Claude 事件 | 映射状态 |
|---|---|
| SessionStart | `startup` |
| PreToolUse Read/Grep/Glob/WebFetch | `reading` |
| PreToolUse Edit/Write/NotebookEdit | `coding` |
| PreToolUse Bash 且命令包含 test/build/lint | `testing` |
| PreToolUse 其他工具 | `tool_running` |
| PostToolUse 成功 | 视上下文回到 `thinking` 或 `idle` |
| PostToolUse 失败 | `error` |
| Stop / 等待输入 | `waiting_user` 或 `success` |

## 9. 推荐目录结构

```text
claude-code-desktop-pet/
  docs/
    handoff.md
    decisions.md
    architecture.md
    event-protocol.md
    mvp-roadmap.md
    superpowers/
      specs/
        2026-06-04-desktop-pet-design.md

  src/
    main/
      main.ts
      window.ts
      tray.ts
      eventBus.ts
      fileDrop.ts

    renderer/
      App.tsx
      components/
        PetStage.tsx
        SpeechBubble.tsx
        ActionMenu.tsx
      pet/
        states.ts
        animations.ts
        personality.ts

    bridge/
      claudeHook.ts
      emitEvent.ts
      watchOutbox.ts
      eventSchema.ts

    shared/
      eventTypes.ts
      paths.ts
      logger.ts

  assets/
    pet/
      placeholder/
        idle/
        thinking/
        coding/
        success/
        error/
    sounds/

  events/
    inbox.jsonl
    outbox.jsonl
    processed.jsonl

  scripts/
    dev.ps1
    install-claude-hook.ps1
    uninstall-claude-hook.ps1

  tests/
    event-protocol.test.ts
    state-machine.test.ts
    file-drop.test.ts

  package.json
  tsconfig.json
  README.md
```

## 10. 文档与交接机制

必须维护以下文档：

- `docs/handoff.md`：当前状态、已完成、下一步、已知问题、运行方式；
- `docs/decisions.md`：关键技术决策及原因；
- `docs/architecture.md`：架构和模块边界；
- `docs/event-protocol.md`：事件格式契约；
- `docs/mvp-roadmap.md`：阶段路线和验收标准；
- `README.md`：项目说明和使用方式。

换模型继续时，下一位模型应优先阅读：

1. `docs/handoff.md`；
2. `docs/decisions.md`；
3. `docs/event-protocol.md`；
4. 本设计规格。

## 11. MVP 里程碑

### Phase 0：设计与项目初始化

产出：设计文档、README 初稿、handoff、git 初始化、Electron/TypeScript 基础结构。

### Phase 1：透明桌宠窗口

产出：透明无边框窗口、置顶、占位角色、托盘退出/重载。

### Phase 2：状态事件总线

产出：JSONL inbox、事件 schema、事件监听器、状态机、状态调试命令。

### Phase 3：待机动作与人格气泡

产出：idle 随机动作、sleepy 长空闲动作、点击/悬停反馈、气泡模板。

### Phase 4：文件拖拽交互

产出：文件 hover、drop 接收、动作菜单、`file.dropped` 事件写入。

### Phase 5：Claude Code Bridge

产出：hook 入口、状态映射、SessionStart 启动、outbox 监听。

### Phase 6：打包与交接

产出：Windows 打包配置、安装说明、hook 配置说明、完整 handoff。

## 12. 测试与验证

### 自动测试

- 事件 schema 校验；
- 状态优先级；
- 状态超时回落；
- 文件事件格式；
- 路径处理；
- Hook 输入映射。

### 人工验证

- 桌宠是否显示在桌面；
- 背景是否透明；
- 是否能退出且不影响桌面；
- 状态切换是否符合直觉；
- 气泡是否自然、不烦人；
- 拖文件是否顺手；
- Claude Code hook 失败是否不阻塞 Claude Code。

## 13. 非 MVP 范围

以下不进入第一版：

- Live2D 精细模型；
- 语音合成；
- 自动理解 PDF/Word/图片内容；
- 多角色皮肤商店；
- 云同步；
- 自动上传文件；
- 完整设置中心；
- 跨平台适配；
- 复杂长期记忆人格。

## 14. 风险与降级策略

- Electron 占用较高：MVP 接受，后续可评估 Tauri。
- JSONL 实时性有限：MVP 足够，后续可升级 WebSocket。
- Claude Code hook 信息不完整：先做粗粒度映射，后续逐步细化。
- 透明窗口拖拽和点击穿透冲突：MVP 先限定桌宠本体区域接收拖拽，菜单区域不穿透。
- hook 脚本失败：必须记录日志并退出 0，不能阻塞 Claude Code。

## 15. 设计结论

第一版采用 **Electron + TypeScript + JSONL 本地事件总线 + Claude Code Bridge**。  
目标是在 Windows 上尽快完成“桌宠可见、状态会变、能接文件、可随 Claude Code 启动、文档可交接”的最小可爱闭环。
