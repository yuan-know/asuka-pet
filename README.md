# Asuka Pet 🤖

A Claude Code desktop companion that reacts to what you're doing in real time.

Asuka sits on your desktop and changes her expression and pose based on Claude Code's current state — reading files, writing code, running tests, or just waiting for you.

## Requirements

- Windows 10 / 11
- Node.js 18+
- Claude Code installed and configured

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/yuan-know/asuka-pet.git
cd asuka-pet
npm install
npm run build
```

### 2. Note your project path

Note the full path to the project folder, e.g.:

```
C:/Users/yourname/projects/asuka-pet
```

### 3. Configure Claude Code hooks

Copy `settings.example.json` and add the hooks section into your Claude Code settings file at `C:/Users/<yourname>/.claude/settings.json`:

```json
"hooks": {
  "SessionStart": [{
    "hooks": [{
      "command": "bash C:/Users/<yourname>/projects/asuka-pet/scripts/hook-pet.sh",
      "timeout": 10,
      "type": "command"
    }],
    "matcher": ""
  }],
  "PreToolUse": [{
    "hooks": [{
      "command": "bash C:/Users/<yourname>/projects/asuka-pet/scripts/hook-pet.sh PreToolUse",
      "timeout": 10,
      "type": "command"
    }],
    "matcher": ""
  }],
  "PostToolUse": [{
    "hooks": [{
      "command": "bash C:/Users/<yourname>/projects/asuka-pet/scripts/hook-pet.sh PostToolUse",
      "timeout": 10,
      "type": "command"
    }],
    "matcher": ""
  }],
  "Stop": [{
    "hooks": [{
      "command": "bash C:/Users/<yourname>/projects/asuka-pet/scripts/hook-pet.sh stop",
      "timeout": 10,
      "type": "command"
    }],
    "matcher": ""
  }]
}
```

Replace `<yourname>` and the path with your actual project location.

### 4. Start Claude Code

Asuka will appear automatically when Claude Code starts a new session.

## States

| State | Trigger |
|-------|---------|
| 🌟 Startup | Claude Code session begins |
| 💭 Thinking | Claude is processing |
| 📖 Reading | Reading files or searching |
| ⌨️ Coding | Editing or writing files |
| 🧪 Testing | Running test commands |
| ⚙️ Tool running | Executing other commands |
| ✅ Success | Task completed |
| ❌ Error | Something went wrong |
| ⏳ Waiting | Waiting for your input |
| 😴 Sleepy | Idle for a while |

## Customization

Replace the images in `assets/` with your own to change Asuka's appearance. Each state corresponds to a PNG file — see the table above for filenames.

## Platform Support

Windows only. Mac and Linux are not currently supported due to PowerShell-based process detection.
