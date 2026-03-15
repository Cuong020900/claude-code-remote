# References

Projects and resources that inspired or informed CCD.

## Primary References

### [ccpoke](https://github.com/nicekid1/ccpoke) — v1.7.4

Two-way bridge connecting AI coding agents (Claude Code, Codex, Cursor, Gemini, OpenCode) with chat apps (Telegram, Discord, Slack). Pioneered the **hooks + tmux** pattern used by CCD.

**Borrowed concepts:**
- Claude Code hooks for push events (Stop, Notification, SessionStart, PermissionRequest)
- `tmux send-keys` for injecting user input into CLI sessions
- `tmux capture-pane` for reading terminal output
- Hook script installation into `~/.claude/settings.json`
- Lock file integrity checking for hook scripts

**Local reference:** [`reference/ccpoke/`](reference/ccpoke/)

---

### Antigravity Deck

Rich web dashboard with WebSocket real-time updates, session management, and chat UI components.

**Borrowed concepts:**
- WebSocket hub for broadcasting events to connected clients
- Session sidebar with state indicators
- Chat view component architecture
- shadcn/ui component patterns

**Local reference:** [`reference/antigravity-deck/`](reference/antigravity-deck/)

---

## Claude Code Official

- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks) — Official hook events API
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — The agent this dashboard bridges
- Settings file: `~/.claude/settings.json` — Hook configuration, env vars, permissions
- History storage: `~/.claude/projects/` — JSONL conversation logs

## Tools & Libraries

| Tool | Usage |
|---|---|
| [Next.js 15](https://nextjs.org/) | Frontend framework |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Express 5](https://expressjs.com/) | Backend HTTP server |
| [ws](https://github.com/websockets/ws) | WebSocket server |
| [pino](https://getpino.io/) | Structured logging |
| [tmux](https://github.com/tmux/tmux) | Terminal multiplexer for session management |
| [cobra](https://github.com/spf13/cobra) | Go CLI framework (ai-autogeneration tool) |
