# Phase 0: Core Infrastructure

## Goal

Build the backend skeleton — receive hook events from Claude Code CLI, manage tmux sessions, and broadcast updates via WebSocket.

## Prerequisites

- Node.js ≥ 20
- tmux installed
- Claude Code CLI installed and working

---

## Components

### 1. Hook Installer (`src/hook-installer.ts`)

Automatically modifies `~/.claude/settings.json` to register CCD's hook scripts.

**Hooks to install:**

| Hook Event | Script | Timeout | Purpose |
|-----------|--------|---------|---------|
| Stop | `~/.ccd/hooks/stop.sh` | 10s | AI finished responding |
| Notification | `~/.ccd/hooks/notification.sh` | 5s | Claude wants user attention |
| SessionStart | `~/.ccd/hooks/session-start.sh` | 5s | New session created |
| PreToolUse | `~/.ccd/hooks/pretooluse.sh` | 5s | Before tool execution |
| PermissionRequest | `~/.ccd/hooks/permission.sh` | 5s | Needs user approval |

**settings.json modification:**

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{ "type": "command", "command": "$HOME/.ccd/hooks/stop.sh", "timeout": 10 }]
    }],
    "Notification": [{
      "hooks": [{ "type": "command", "command": "$HOME/.ccd/hooks/notification.sh", "timeout": 5 }]
    }],
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "$HOME/.ccd/hooks/session-start.sh", "timeout": 5 }]
    }],
    "PreToolUse": [{
      "matcher": "AskUserQuestion",
      "hooks": [{ "type": "command", "command": "$HOME/.ccd/hooks/pretooluse.sh", "timeout": 5 }]
    }],
    "PermissionRequest": [{
      "hooks": [{ "type": "command", "command": "$HOME/.ccd/hooks/permission.sh", "timeout": 5 }]
    }]
  }
}
```

**Key behaviors:**
- Idempotent — safe to run multiple times
- Preserves existing hooks (append, don't replace)
- Uses a marker (e.g. `# ccd-hook`) to identify our hooks for uninstall
- Copies shell scripts to `~/.ccd/hooks/`

**Reference:** [ccpoke claude-code-installer.ts](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/src/agent/claude-code/claude-code-installer.ts)

---

### 2. Hook Shell Scripts (`src/hooks/`)

Each hook script:
1. Reads event JSON from stdin
2. Detects tmux target (if running in tmux)
3. POSTs JSON to CCD backend

**Common library (`lib/common.sh`):**

```bash
#!/bin/bash
CCD_PORT="${CCD_PORT:-3500}"
CCD_SECRET=$(cat "$HOME/.ccd/secret" 2>/dev/null || echo "")

ccd_post() {
  local endpoint="$1" body="$2" timeout="${3:-5}"
  curl -sS --max-time "$timeout" \
    -H "Content-Type: application/json" \
    -H "X-CCD-Secret: $CCD_SECRET" \
    -d "$body" \
    "http://127.0.0.1:$CCD_PORT$endpoint" >/dev/null 2>&1 || true
}

ccd_detect_tmux() {
  if [ -n "$TMUX" ]; then
    CCD_TMUX_TARGET=$(tmux display-message -p '#{session_name}:#{window_index}.#{pane_index}' 2>/dev/null || echo "")
  fi
}

ccd_inject_tmux() {
  local input="$1"
  if [ -n "$CCD_TMUX_TARGET" ]; then
    echo "$input" | sed "s/}$/,\"tmux_target\":\"$CCD_TMUX_TARGET\"}/"
  else
    echo "$input"
  fi
}
```

**Example: stop.sh**

```bash
#!/bin/bash
. "$HOME/.ccd/hooks/lib/common.sh"
INPUT=$(cat | tr -d '\n\r')
echo "$INPUT" | grep -q '"session_id"' || exit 0
ccd_detect_tmux
INPUT=$(ccd_inject_tmux "$INPUT")
ccd_post "/hook/stop" "$INPUT" 10
```

**Reference:** [ccpoke hooks/](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/hooks)

---

### 3. Hook Receiver (`src/hook-receiver.ts`)

Express routes that receive POSTs from hook scripts.

**Endpoints:**

| Method | Path | Event |
|--------|------|-------|
| POST | `/hook/stop` | Agent finished response |
| POST | `/hook/notification` | Claude notification/question |
| POST | `/hook/session-start` | New session started |
| POST | `/hook/pretooluse` | Pre tool-use (AskUserQuestion) |
| POST | `/hook/permission` | Permission request |
| GET | `/hook/health` | Health check |

**Security:** Validate `X-CCD-Secret` header against stored secret (auto-generated crypto hex).

**On each event:**
1. Validate secret
2. Parse JSON body
3. Emit to EventBus: `bus.emit('hook:stop', parsedEvent)`
4. Return 200 immediately (non-blocking)

**Reference:** [ccpoke api-server.ts](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/src/server/api-server.ts)

---

### 4. tmux Bridge (`src/tmux-bridge.ts`)

Wrapper around tmux CLI commands for session management.

**Methods:**

| Method | tmux Command | Purpose |
|--------|-------------|---------|
| `sendKeys(target, text, submitKeys)` | `tmux send-keys -t <target> -l <text>` + `Enter` | Send user message to Claude |
| `sendSpecialKey(target, key)` | `tmux send-keys -t <target> <key>` | Send Enter, y, n, etc. |
| `capturePane(target, lines)` | `tmux capture-pane -t <target> -p -S -<lines>` | Read terminal output |
| `createPane(session, cwd)` | `tmux split-window -c <cwd>` or `tmux new-session` | Create new pane for agent |
| `killPane(target)` | `tmux kill-pane -t <target>` | Kill session |
| `isTmuxAvailable()` | `tmux -V` | Check if tmux is installed |
| `hasSession(name)` | `tmux has-session -t <name>` | Check session exists |

**tmux target format:** `session_name:window_index.pane_index` (e.g., `ccd:0.1`)

**Reference:** [ccpoke tmux-bridge.ts](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/src/tmux/tmux-bridge.ts)

---

### 5. Session Manager (`src/session-manager.ts`)

Tracks active Claude Code sessions and maps them to tmux targets.

**State machine:**

```
SessionStart hook → IDLE
Stop hook → IDLE (response done)
User sends message → BUSY
PermissionRequest → WAITING
Permission approved → BUSY
```

**Data model:**

```typescript
interface Session {
  id: string;              // Claude session_id
  tmuxTarget: string;      // e.g. "ccd:0.1"
  cwd: string;             // Working directory
  project: string;         // Project name (basename of cwd)
  state: 'idle' | 'busy' | 'waiting';
  agent: string;           // "claude-code"
  createdAt: number;
  lastActivity: number;
}
```

**Key methods:**
- `register(sessionId, tmuxTarget, cwd)` — Called on SessionStart hook
- `updateState(sessionId, state)` — Called on hook events
- `getAll()` — List all active sessions
- `getBySessionId(id)` — Lookup by session ID
- `remove(sessionId)` — On pane close/kill

---

### 6. WebSocket Hub (`src/ws-hub.ts`)

Manages WebSocket connections and broadcasts events to frontend.

**Message types:**

| Type | Direction | When |
|------|-----------|------|
| `agent_stopped` | Server → Client | Stop hook fired |
| `notification` | Server → Client | Notification hook fired |
| `permission_request` | Server → Client | Permission hook fired |
| `session_started` | Server → Client | SessionStart hook fired |
| `session_updated` | Server → Client | Session state changed |
| `set_session` | Client → Server | Client switches to a session |
| `subscribe_all` | Client → Server | Client wants all events |

**Reference:** [Antigravity Deck ws.js](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/antigravity-deck/src/ws.js)

---

### 7. Event Bus (`src/event-bus.ts`)

Central EventEmitter connecting hook-receiver → session-manager → ws-hub → telegram.

```
hook-receiver ──emit──► event-bus ──► session-manager (update state)
                                  ──► ws-hub (broadcast to web)
                                  ──► telegram (forward to bot) [Phase 2]
```

---

### 8. Entry Point (`server.ts`)

```typescript
// 1. Load config
// 2. Generate secret if not exists
// 3. Install hooks (if not installed)
// 4. Start Express server
// 5. Mount hook-receiver routes
// 6. Start WebSocket server
// 7. Wire up event bus
// 8. Log startup info
```

---

## Files to Create

| File | LOC (est.) | Priority |
|------|-----------|----------|
| `src/config.ts` | ~60 | P0 |
| `src/event-bus.ts` | ~30 | P0 |
| `src/hook-installer.ts` | ~150 | P0 |
| `src/hooks/lib/common.sh` | ~30 | P0 |
| `src/hooks/stop.sh` | ~8 | P0 |
| `src/hooks/notification.sh` | ~8 | P0 |
| `src/hooks/session-start.sh` | ~12 | P0 |
| `src/hooks/pretooluse.sh` | ~8 | P0 |
| `src/hooks/permission.sh` | ~8 | P0 |
| `src/hook-receiver.ts` | ~120 | P0 |
| `src/tmux-bridge.ts` | ~150 | P0 |
| `src/session-manager.ts` | ~120 | P0 |
| `src/ws-hub.ts` | ~80 | P0 |
| `server.ts` | ~100 | P0 |
| `package.json` | ~40 | P0 |
| `tsconfig.json` | ~20 | P0 |
| `scripts/setup.ts` | ~80 | P1 |

**Total estimated: ~1,000 LOC**

---

## Verification

- [x] `pnpm dev` starts backend on :3500
- [x] Hooks installed in `~/.claude/settings.json`
- [x] Hook scripts copied to `~/.ccd/hooks/`
- [x] Run `claude` in terminal → Stop hook fires → backend logs event
- [x] WebSocket client connects → receives `agent_stopped` event
- [x] `tmux send-keys` successfully sends text to a claude pane
- [x] Session manager tracks sessions correctly across hook events
