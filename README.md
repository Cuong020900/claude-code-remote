# Claude Code Dashboard (CCD)

Remote control dashboard for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI — monitor sessions, chat, approve permissions, and browse history from anywhere.

```
Claude Code CLI (in tmux panes)
       │ hooks fire (push events)
       ▼
Backend (Express :3500)
       │ WebSocket broadcast
       ├──► Web Dashboard (Next.js :3000)
       └──► Telegram Bot (planned)
       │ tmux send-keys (inject input)
       ▼
Claude Code CLI (receives user messages)
```

## Features

- 📡 **Real-time monitoring** — See Claude's output live via tmux capture
- 💬 **Remote chat** — Send prompts from any device
- ✅ **Permission approval** — Approve tool use from the web UI
- 📜 **History browser** — Search and browse all conversation history
- 🖥️ **Terminal pane** — Resizable live terminal view beside chat
- 🔌 **Multi-session** — Manage multiple Claude instances via tmux

## Quick Start

```bash
# Install dependencies
pnpm install
cd frontend && pnpm install && cd ..

# Build
pnpm build

# Launch (starts backend + frontend + opens browser)
pnpm ccd:open
```

The dashboard opens at `http://localhost:3000`.

## Project Structure

```
├── server.ts                  # Express backend entry
├── src/
│   ├── cli.ts                 # CLI entry (ccd command)
│   ├── config.ts              # Settings, paths, env
│   ├── tmux-bridge.ts         # tmux send-keys / capture-pane
│   ├── session-manager.ts     # Session tracking + state machine
│   ├── history-reader.ts      # Parse ~/.claude/projects/ JSONL
│   ├── ws-hub.ts              # WebSocket broadcast
│   ├── hook-installer.ts      # Install hooks into settings.json
│   ├── hooks/                 # Shell scripts for ~/.ccd/hooks/
│   └── routes/                # REST API routes
├── frontend/                  # Next.js 15 + React 19 app
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   └── hooks/                 # Custom hooks (WebSocket, etc.)
├── ai-autogeneration/         # AI CLI tool (Go) — "ai" command
└── reference/                 # Reference implementations
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express 5 + TypeScript |
| Frontend | Next.js 15 + React 19 + shadcn/ui |
| WebSocket | ws |
| Session mgmt | tmux |
| Package manager | pnpm |
| Logging | pino |

## How It Works

1. **Hooks**: Shell scripts installed into `~/.claude/settings.json` fire on Claude Code events (SessionStart, Stop, Notification)
2. **Backend**: Express server receives hook events, broadcasts via WebSocket, manages tmux panes
3. **Frontend**: Next.js dashboard connects over WebSocket for real-time updates, polls tmux for terminal output
4. **Input**: User messages are injected into Claude's tmux pane via `tmux send-keys`

## Bundled Tools

### `ai` — AI Command Completion

Translate natural language to shell commands using Claude API.

```bash
cd ai-autogeneration && make build
./ai "list all files with sizes"    # → ls -lah
./ai -y "current date"              # auto-run
./ai -n "compress src"              # dry-run
```

See [ai-autogeneration/README.md](ai-autogeneration/README.md) for details.

## References

See [REFERENCES.md](REFERENCES.md) for credits and inspiration sources.

## License

MIT
