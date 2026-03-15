# Phase 3: Polish & Advanced Features

## Goal

Production-ready features: remote access, authentication, file browser, git integration, resource monitoring.

---

## Features

### 1. Remote Access (Phase 3.1)

**Cloudflare Tunnel:**
```bash
# Start tunnel + backend + frontend
pnpm run online

# Auto-generates:
# - Random tunnel URL (e.g., https://random-words.trycloudflare.com)
# - Auth key (or use existing AUTH_KEY)
# - QR code for mobile access
```

**Implementation:**
- Use `cloudflared` binary
- Create tunnels for both :3500 (API) and :3000 (frontend)
- Embed auth key in QR code for seamless mobile login

### 2. Authentication (Phase 3.1)

**Auth flow:**
1. First visit → redirect to `/login`
2. Enter auth key → stored in localStorage
3. All API requests include `Authorization: Bearer <key>`
4. Invalid/missing key → 401 Unauthorized

**Implementation:**
- `AUTH_KEY` env var required for production
- Middleware: `auth-middleware.ts`
- Login page: simple form, stores token

### 3. File Explorer (Phase 3.2)

**Features:**
- Tree view of workspace files
- File viewer with syntax highlighting
- Support 30+ languages

**API:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/tree?cwd=` | File tree for directory |
| GET | `/api/files/read?path=` | Read file content |

**Reference:** Antigravity Deck file explorer

### 4. Git Integration (Phase 3.2)

**Features:**
- Git status (modified, added, deleted, untracked)
- Side-by-side diffs
- Stage, commit, push, pull

**API:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/git/status?cwd=` | Git status |
| GET | `/api/git/diff?cwd=` | Unified diff |
| POST | `/api/git/commit` | Commit staged changes |
| POST | `/api/git/push` | Push to remote |
| POST | `/api/git/pull` | Pull from remote |

### 5. Resource Monitor (Phase 3.2)

**Features:**
- CPU/RAM per session
- System overview
- History graphs

**Implementation:**
- Poll system stats every 5 seconds
- Aggregate per tmux pane process
- Display in sidebar or dedicated page

### 6. Multi-User Support (Phase 3.3)

**Features:**
- Multiple Telegram users can connect
- Role-based access (admin, user)
- User whitelist/blacklist

**Data model:**
```typescript
interface User {
  id: string;          // Telegram user ID
  name: string;        // Display name
  role: 'admin' | 'user';
  allowed: boolean;
  createdAt: number;
}
```

### 7. Auto-Accept Rules (Phase 3.3)

**Features:**
- Configurable per-tool auto-approve
- E.g., auto-accept all Read operations
- Safety: never auto-accept destructive tools

**Config:**
```json
{
  "autoAccept": {
    "Read": true,
    "Edit": false,
    "Bash": false,
    "Write": false
  }
}
```

### 8. MCP Tools Exposure (Phase 3.3)

**Features:**
- List available MCP servers
- Call MCP tools from dashboard
- Display MCP tool results

---

## Files to Create

### Phase 3.1 (Remote + Auth)

| File | Purpose |
|------|---------|
| `scripts/start-tunnel.ts` | Start cloudflared tunnel |
| `src/middleware/auth.ts` | Auth middleware |
| `frontend/app/login/page.tsx` | Login page |

### Phase 3.2 (Files + Git)

| File | Purpose |
|------|---------|
| `src/routes/files.ts` | File tree + read |
| `src/routes/git.ts` | Git operations |
| `frontend/components/FileExplorer.tsx` | File tree component |
| `frontend/components/GitPanel.tsx` | Git status + diff |

### Phase 3.3 (Advanced)

| File | Purpose |
|------|---------|
| `src/routes/users.ts` | User management |
| `src/config/auto-accept.ts` | Auto-accept rules |
| `src/routes/mcp.ts` | MCP tools proxy |

---

## Verification

- [ ] `pnpm run online` → tunnel URL + QR code
- [ ] Visit URL without auth key → login page
- [ ] Enter correct key → access dashboard
- [ ] File explorer shows workspace files
- [ ] Git status shows modified files
- [ ] Resource monitor shows CPU/RAM per session

---

## Tech Stack Additions

| Layer | Technology |
|-------|-----------|
| Auth | Bearer token + localStorage |
| Tunnel | cloudflared |
| File viewing | @git-diff-view |
| Diff syntax | prismjs / highlight.js |
