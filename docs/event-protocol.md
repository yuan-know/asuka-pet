# 事件协议

## 设计原则

- 事件采用 JSONL，每行一个 JSON 对象。
- `inbox.jsonl` 表示 Claude Code/Bridge 发给桌宠。
- `outbox.jsonl` 表示桌宠发给 Bridge/Claude Code。
- 事件必须包含 `id`、`time`、`source`、`type`、`payload`。

## 状态事件

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

## 文件投递事件

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

## 状态枚举

- `startup`
- `idle`
- `thinking`
- `tool_running`
- `reading`
- `coding`
- `testing`
- `waiting_user`
- `success`
- `error`
- `file_hover`
- `file_received`
- `sleepy`

## 文件动作枚举

- `send_to_claude`
- `add_to_project_context`
- `record_only`
- `cancel`

## 代码来源

事件枚举、TypeScript 类型、工厂函数和运行时校验位于：

- `src/shared/eventTypes.ts`

测试位于：

- `tests/event-protocol.test.ts`
