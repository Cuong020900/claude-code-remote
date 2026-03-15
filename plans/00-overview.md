# Claude Code Dashboard (CCD) — Project Overview

## Problem

You're using Claude Code CLI on your laptop. You step away but want to:
- See if the AI is done
- Send more prompts from your phone
- Approve permission requests remotely
- Browse conversation history
- Manage multiple sessions

## Solution

A **web dashboard** (Phase 1) + **Telegram bot** (Phase 2) that bridges Claude Code CLI — letting you code from anywhere.

## Architecture: Hooks + tmux + Web

```
Claude Code CLI (in tmux panes)
       │ hooks fire (push events)
       ▼
Backend (Express :3500)
       │ WebSocket broadcast
       ├──► Web Dashboard (Next.js :3000)
       └──► Telegram Bot (Phase 2)
       │ tmux send-keys (inject input)
       ▼
Claude Code CLI (receives user messages)
```

### Why this approach?

| Decision | Choice | Why |
|----------|--------|-----|
| Receive events | **Claude Code hooks** | Official API, zero-latency push, proven by ccpoke |
| Send input | **tmux send-keys** | Inject into running CLI session, proven by ccpoke |
| Session mgmt | **tmux panes** | Multi-session, observable, killable |
| History | **JSONL reader** | Read `~/.claude/projects/` — official storage format |
| Web UI | **Next.js + shadcn/ui** | Modern, premium look |

### Reference Implementations

- **[ccpoke](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke)** — Hooks + tmux bridge + Telegram bot (primary reference)
- **[Antigravity Deck](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/antigravity-deck)** — Rich web dashboard with WebSocket real-time updates

## Phases

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| [Phase 0](file:///Users/trancuong/workspace/TEST/claude-code-remote/plans/01-phase0-core.md) | Core Infrastructure | ✅ Complete |
| [Phase 1](file:///Users/trancuong/workspace/TEST/claude-code-remote/plans/02-phase1-web.md) | Web Dashboard | ✅ Complete |
| [Phase 1.5](file:///Users/trancuong/workspace/TEST/claude-code-remote/plans/05-phase1-unified-cli.md) | Unified CLI (`ccd`) | ✅ Complete |
| [Phase 2](file:///Users/trancuong/workspace/TEST/claude-code-remote/plans/03-phase2-telegram.md) | Telegram Bot | Notifications, 2-way chat, permission buttons |
| [Phase 3](file:///Users/trancuong/workspace/TEST/claude-code-remote/plans/04-phase3-polish.md) | Polish & Advanced | Remote access, auth, git, file explorer |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Backend | Node.js + Express 5 |
| Frontend | Next.js 15 + React 19 |
| UI Kit | shadcn/ui + Tailwind CSS 4 |
| WebSocket | ws |
| tmux IPC | child_process.execSync |
| Telegram | node-telegram-bot-api |
| Tunnel | cloudflared |
| Package mgr | pnpm |
| Logging | pino |

## Project Structure

```
claude-code-dashboard/
├── server.ts                  # Entry point (exports main() for CLI import)
├── src/
│   ├── cli.ts                 # Unified CLI entry point (ccd command)
│   ├── cli-open-handler.ts    # Spawn frontend + open browser
│   ├── config.ts              # Settings, paths, env
│   ├── event-bus.ts           # Central EventEmitter
│   ├── hook-receiver.ts       # Express routes for hook events
│   ├── hook-installer.ts      # Install hooks into ~/.claude/settings.json
│   ├── hooks/                 # Shell scripts installed to ~/.ccd/hooks/
│   ├── tmux-bridge.ts         # tmux send-keys, capture-pane, create-pane
│   ├── session-manager.ts     # Session tracking + state machine
│   ├── history-reader.ts      # Parse ~/.claude/projects/ JSONL
│   ├── ws-hub.ts              # WebSocket manager + broadcast
│   ├── routes/                # REST API routes
│   └── telegram/              # Phase 2: Telegram bot
├── frontend/                  # Next.js app
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   └── hooks/                 # Custom hooks
├── scripts/
│   ├── setup.ts               # Interactive setup wizard
│   └── start-tunnel.ts       # Production launcher
└── package.json
```
