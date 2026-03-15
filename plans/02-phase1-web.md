# Phase 1: Web Dashboard

## Goal

Build a full-featured web dashboard for interacting with Claude Code sessions — chat UI with real-time updates, session management, conversation history browsing, and permission approval.

## Prerequisites

- Phase 0 complete (hook receiver, tmux bridge, WebSocket hub working)

---

## Backend Additions

### 1. History Reader (`src/history-reader.ts`)

Reads Claude Code's local conversation storage.

**Storage format:**

```
~/.claude/projects/
├── Users-trancuong-workspace-project-a/
│   ├── sessions-index.json      # Session metadata index
│   ├── abc123.jsonl             # Session transcript
│   └── def456.jsonl
└── Users-trancuong-workspace-project-b/
    ├── sessions-index.json
    └── ghi789.jsonl
```

**sessions-index.json structure:**

```json
{
  "sessions": [
    {
      "id": "abc123",
      "summary": "Fixed auth bug in login.go",
      "messageCount": 42,
      "gitBranch": "fix/auth",
      "createdAt": "2026-03-14T10:00:00Z",
      "lastModifiedAt": "2026-03-14T10:30:00Z"
    }
  ]
}
```

**JSONL line format:** Each line is a JSON object representing one turn:

```json
{"role":"user","content":"fix the login bug","timestamp":"...","sessionId":"abc123"}
{"role":"assistant","content":"I'll look at...","model":"claude-sonnet-4-20250514","toolCalls":[...]}
```

**Methods:**

| Method | Returns |
|--------|---------|
| `listProjects()` | All project directories with metadata |
| `listSessions(projectPath)` | Sessions from sessions-index.json |
| `getSession(projectPath, sessionId)` | Full JSONL parsed transcript |
| `searchSessions(query)` | Search across all sessions |

---

### 2. REST API Routes

#### Chat Routes (`src/routes/chat.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/send` | Send message to active session via tmux |
| POST | `/api/chat/new-session` | Create new tmux pane + launch claude |
| POST | `/api/chat/accept` | Accept pending permission (send 'y') |
| POST | `/api/chat/reject` | Reject pending permission (send 'n') |
| POST | `/api/chat/cancel` | Send Ctrl+C to cancel running task |

**`POST /api/chat/send` flow:**

```
1. Validate { sessionId, message }
2. Lookup session → get tmuxTarget
3. tmuxBridge.sendKeys(target, message, ['Enter'])
4. sessionManager.updateState(sessionId, 'busy')
5. Return { ok: true }
```

#### Session Routes (`src/routes/sessions.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all active sessions with state |
| GET | `/api/sessions/:id` | Get session details |
| GET | `/api/sessions/:id/output` | Capture current tmux pane output |
| DELETE | `/api/sessions/:id` | Kill session (kill tmux pane) |

#### History Routes (`src/routes/history.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history/projects` | List all projects |
| GET | `/api/history/projects/:path/sessions` | Sessions for a project |
| GET | `/api/history/sessions/:id` | Full session transcript |
| GET | `/api/history/search?q=` | Search across all history |

#### Project Routes (`src/routes/projects.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List registered projects |
| POST | `/api/projects` | Register a new project path |
| DELETE | `/api/projects/:id` | Unregister a project |

---

## Frontend (Next.js 15 + shadcn/ui)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Active sessions overview, system status |
| `/chat/[id]` | Chat View | Real-time chat with a Claude session |
| `/history` | History Browser | Browse past conversations |
| `/history/[id]` | History Detail | Full transcript of past session |
| `/projects` | Projects | Manage registered project paths |
| `/settings` | Settings | Config, theme, hooks status |

### Key Components

#### `SessionSidebar`
- List of active sessions with state indicators (🟢 idle, 🔵 busy, 🟡 waiting)
- Project name + session duration
- Click to switch chat view
- "New Session" button

#### `ChatView`
- Message list with auto-scroll
- Markdown rendering (react-markdown + rehype-highlight)
- Tool call cards (collapsible)
- Input box at bottom
- Permission dialog overlay when waiting

#### `MessageBubble`
- User messages: right-aligned, accent color
- Claude messages: left-aligned, markdown rendered
- Timestamps, model badge

#### `ToolCallCard`
- Expandable card showing tool name + input/output
- Syntax highlighted code for Bash, Edit, Read
- File path links
- Status indicator (pending/done/error)

#### `PermissionDialog`
- Modal overlay when `permission_request` received
- Shows tool name, input details
- Approve / Reject buttons
- Auto-dismiss on response

#### `HistoryBrowser`
- Project filter sidebar
- Session list with summaries, message counts, dates
- Search bar
- Click to view full transcript

#### `StatusBar`
- WebSocket connection status (🟢 connected / 🔴 disconnected)
- Active sessions count
- Last event timestamp

### WebSocket Client Hook (`hooks/useWebSocket.ts`)

```typescript
function useWebSocket() {
  // Connect to ws://localhost:3500
  // Auto-reconnect on disconnect
  // Parse incoming messages by type
  // Return: { connected, sessions, events, sendMessage }
}
```

### Design Principles
- **Dark theme default** with light mode toggle
- **shadcn/ui** for all components — consistent, premium look
- **Inter** font from Google Fonts
- Smooth transitions and micro-animations
- Responsive — works on phone browsers (for remote access in Phase 3)

---

## Files to Create

### Backend

| File | LOC (est.) |
|------|-----------|
| `src/history-reader.ts` | ~150 |
| `src/routes/chat.ts` | ~100 |
| `src/routes/sessions.ts` | ~80 |
| `src/routes/history.ts` | ~100 |
| `src/routes/projects.ts` | ~60 |

### Frontend

| File | LOC (est.) |
|------|-----------|
| `frontend/app/layout.tsx` | ~60 |
| `frontend/app/page.tsx` | ~100 |
| `frontend/app/chat/[id]/page.tsx` | ~80 |
| `frontend/app/history/page.tsx` | ~80 |
| `frontend/app/history/[id]/page.tsx` | ~60 |
| `frontend/app/settings/page.tsx` | ~60 |
| `frontend/components/SessionSidebar.tsx` | ~120 |
| `frontend/components/ChatView.tsx` | ~200 |
| `frontend/components/MessageBubble.tsx` | ~100 |
| `frontend/components/ToolCallCard.tsx` | ~120 |
| `frontend/components/PermissionDialog.tsx` | ~80 |
| `frontend/components/HistoryBrowser.tsx` | ~120 |
| `frontend/components/StatusBar.tsx` | ~40 |
| `frontend/hooks/useWebSocket.ts` | ~80 |
| `frontend/lib/api.ts` | ~60 |

**Total estimated: ~1,850 LOC**

---

## Verification

- [ ] Open dashboard → see list of active sessions
- [ ] Click session → see chat history + real-time updates
- [ ] Type message → Claude receives it in tmux → responds → WebSocket pushes to UI
- [ ] Permission request → dialog appears → approve → Claude continues
- [ ] History page → browse past conversations from JSONL
- [ ] New session → tmux pane created → claude launched → session appears in sidebar
- [ ] Kill session → tmux pane killed → removed from sidebar
- [ ] Mobile responsive — usable on phone browser
