# 架构说明

## 架构目标

第一版目标是构建一个 Windows 优先的 Claude Code 桌宠 MVP，让桌宠能够显示在桌面、响应 Claude Code 状态、接收文件拖拽，并通过文档和事件日志保持可交接。

## 模块边界

### 桌宠显示层

负责 Electron 窗口、角色渲染、动画、气泡、动作菜单、托盘、拖拽反馈。

### 本地事件总线层

负责 JSONL 事件读写、事件 schema、状态派发、outbox 记录。

### Claude Code Bridge 层

负责 Claude Code hook 入口、状态映射、开发期 emit 命令、outbox 监听。

## 主要数据流

```text
Claude Code Hook → Bridge → events/inbox.jsonl → Electron 主进程 → Renderer 桌宠状态
Renderer 文件拖拽 → events/outbox.jsonl → Bridge / Claude Code 后续处理
```

## 降级原则

桌宠是增强体验，不能阻塞 Claude Code。Bridge/hook 出错时应记录日志并安全退出。
