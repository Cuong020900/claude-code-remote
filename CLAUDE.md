# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Dashboard (CCD) — A remote control system for Claude Code CLI. Allows you to monitor and interact with Claude Code sessions from a web dashboard or Telegram bot, bridging the CLI with real-time WebSocket updates and tmux session management.

**Current Status:** Phase 0 (Core Infrastructure) + Phase 1 (Web Dashboard) + Phase 1.5 (Unified CLI) complete. See `plans/` for detailed phase breakdown.

## Architecture

```
Claude Code CLI (in tmux panes)
       │ hooks fire (push events)
       ▼
Backend (Express :3500)
       │ WebSocket broadcast
       ├──► Web Dashboard (Next.js :3000)
       └──► Telegram Bot (Phase 2)
       ▼ tmux send-keys (inject input)
Claude Code CLI (receives user messages)
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| CLI Entry | `src/cli.ts` | Unified `ccd` command — subcommand dispatch |
| CLI Open | `src/cli-open-handler.ts` | Spawn Next.js frontend + open browser |
| Hook Installer | `src/hook-installer.ts` | Registers CCD hooks in `~/.claude/settings.json` |
| Hook Receiver | `src/hook-receiver.ts` | Express routes receiving POST from hook scripts |
| tmux Bridge | `src/tmux-bridge.ts` | Wrapper around tmux CLI (send-keys, capture-pane, etc.) |
| Session Manager | `src/session-manager.ts` | Tracks active sessions + state machine |
| WebSocket Hub | `src/ws-hub.ts` | Broadcasts events to frontend |
| History Reader | `src/history-reader.ts` | Parses `~/.claude/projects/` JSONL files |

### Data Flow

1. User runs `claude` in a tmux pane
2. CCD hook scripts fire on events (Stop, Notification, SessionStart, etc.)
3. Hook scripts POST to backend (`/hook/*` endpoints)
4. Backend emits to EventBus → updates SessionManager → broadcasts via WebSocket
5. Frontend receives real-time updates
6. User can send messages via REST API → tmuxBridge.sendKeys() → Claude receives input

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Backend | Node.js + Express 5 |
| Frontend | Next.js 15 + React 19 |
| UI | shadcn/ui + Tailwind CSS 4 |
| WebSocket | ws |
| tmux IPC | child_process.execSync |
| Telegram | node-telegram-bot-api |
| Package Manager | pnpm |
| Logging | pino |

## Reference Implementations

Two reference projects in `reference/` folder:

- **[Antigravity Deck](reference/antigravity-deck/)** — Rich web dashboard with WebSocket real-time updates
- **[ccpoke](reference/ccpoke/)** — Hooks + tmux bridge + Telegram bot

Reference code paths:
- ccpoke hook installer: `reference/ccpoke/src/agent/claude-code/claude-code-installer.ts`
- ccpoke API server: `reference/ccpoke/src/server/api-server.ts`
- ccpoke tmux bridge: `reference/ccpoke/src/tmux/tmux-bridge.ts`
- Antigravity ws: `reference/antigravity-deck/src/ws.js`

## Development Commands

```bash
# Install dependencies
pnpm install

# Start backend (dev mode with auto-reload)
pnpm dev

# Unified CLI — start backend only
pnpm ccd

# Unified CLI — start backend + frontend + open browser
pnpm ccd:open

# Unified CLI — install hooks
pnpm ccd:setup

# TypeScript type check
pnpm typecheck

# Build backend TypeScript
pnpm build

# Start frontend (Next.js) standalone
cd frontend && pnpm dev

# Install Claude Code hooks (legacy)
pnpm run setup
```

## Project Structure

```
claude-code-dashboard/
├── server.ts                  # Entry point (exports main() for CLI)
├── src/
│   ├── cli.ts                 # Unified CLI entry point (ccd)
│   ├── cli-open-handler.ts    # Spawn frontend + open browser
│   ├── config.ts              # Settings, paths, env
│   ├── logger.ts              # Pino logger
│   ├── event-bus.ts           # Central EventEmitter
│   ├── hook-receiver.ts       # Express routes for hook events
│   ├── hook-installer.ts      # Install hooks into ~/.claude/settings.json
│   ├── hooks/                 # Shell scripts installed to ~/.ccd/hooks/
│   │   ├── lib/common.sh      # Shared bash library
│   │   ├── stop.sh            # Stop hook
│   │   ├── notification.sh    # Notification hook
│   │   ├── session-start.sh   # SessionStart hook
│   │   ├── pretooluse.sh      # PreToolUse hook
│   │   └── permission.sh      # PermissionRequest hook
│   ├── tmux-bridge.ts         # tmux send-keys, capture-pane, create-pane
│   ├── session-manager.ts     # Session tracking + state machine
│   ├── ws-hub.ts              # WebSocket manager + broadcast
│   └── routes/                # REST API routes (Phase 1+)
├── frontend/                  # Next.js app (Phase 1)
└── scripts/
    └── setup.ts               # Interactive setup wizard
```

## Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Core Infrastructure | ✅ Complete |
| Phase 1 | Web Dashboard | ✅ Complete |
| Phase 1.5 | Unified CLI (`ccd`) | ✅ Complete |
| Phase 2 | Telegram Bot | Pending |
| Phase 3 | Polish & Advanced | Pending |

See `plans/00-overview.md` for detailed phase breakdown.

## Important Notes

- **Hooks require tmux**: Claude Code must run inside tmux panes for CCD to track sessions
- **Hook scripts live at** `~/.ccd/hooks/` after installation
- **Secret validation**: All hook POSTs must include `X-CCD-Secret` header
- **Session state machine**: IDLE → BUSY → WAITING (for permissions)
- **History storage**: Claude Code stores conversations in `~/.claude/projects/` as JSONL
