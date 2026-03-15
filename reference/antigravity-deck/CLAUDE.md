# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Antigravity Deck** is a full-featured workspace dashboard for Antigravity (Codeium's AI coding assistant). It provides a web interface to view, send, and manage AI conversations across multiple workspaces with resource monitoring, source control, headless IDE, agent bridge, and remote access.

## Commands

```bash
# Install dependencies (root + frontend)
npm run setup

# Start both backend (port 3500) and frontend (port 3000)
npm run dev

# Start backend only
npm run server

# Start with Cloudflare tunnel (remote access with auto-generated auth)
npm run online

# With custom auth key
AUTH_KEY=your-secret-key npm run dev
```

## Architecture

```
┌──────────────────┐   JSON + Binary Proto   ┌───────────────┐
│  Antigravity LS  │ ◄───────────────────── │   server.js   │
│  (auto-detected) │   Connect Protocol     │   :3500 API   │
└──────────────────┘                         └───────┬───────┘
                                                    │ WebSocket
       ┌──────────────┐                      ┌───────┴───────┐
       │  Discord Bot  │ ◄─── Agent Bridge ──│   Next.js     │
       │  (optional)   │                     │   :3000 UI    │
       └──────────────┘                      └───────────────┘
```

### Backend (`/`)

| File | Purpose |
|------|---------|
| `server.js` | Express server, WebSocket hub, routing |
| `src/api.js` | LS API proxy methods |
| `src/detector.js` | Auto-detect running LS processes |
| `src/poller.js` | Adaptive polling for conversation updates |
| `src/ws.js` | WebSocket message handling |
| `src/resource-monitor.js` | CPU/RAM/Disk monitoring |
| `src/headless-ls.js` | Headless LS lifecycle management |
| `src/cascade.js` | Cascade control (accept/reject/cancel) |
| `src/agent-bridge.js` | Discord ↔ Cascade relay |
| `src/discord-relay.js` | Discord bot with slash commands |
| `src/protobuf.js` | Binary protobuf encoding for LS handshake |

### Frontend (`frontend/`)

- **Next.js 16** with App Router
- **React 19** + **Tailwind CSS 4**
- **shadcn/ui** (Radix UI) components
- Key components in `frontend/components/` organized by feature

## Key Patterns

- **Backend polling**: Adaptive rate (1s active → 5s idle)
- **Conversation fetching**: Hybrid JSON + binary protobuf to bypass 598-step limit
- **Workspace detection**: Auto-discovers LS processes, ports, CSRF tokens (Windows/macOS/Linux)
- **Headless LS**: Mock parent pipe for stdin handshake, proper workspace binding

## Development Notes

- Backend is **JavaScript** (no TypeScript)
- Frontend is **TypeScript**
- Uses **pnpm** as package manager
- Backend runs on port 3500, frontend on port 3000
- WebSocket connects frontend to backend for real-time updates

## Auth

- Set `AUTH_KEY` environment variable to enable authentication
- Cloudflare tunnel (`npm run online`) auto-generates auth key and embeds in QR code
