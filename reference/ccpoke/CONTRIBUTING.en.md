# Contributing to ccpoke

[Tiếng Việt](./CONTRIBUTING.md)

Thanks for your interest in ccpoke! We welcome all contributions — bug fixes, new features, documentation improvements, or adding support for new agents/channels.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** (project uses `pnpm@10.28.2`)
- **tmux** — required for two-way interaction features

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repo on GitHub
# https://github.com/kaida-palooza/ccpoke

git clone https://github.com/<your-username>/ccpoke.git
cd ccpoke
pnpm install
```

### 2. Create a Branch

```bash
git checkout -b feat/feature-name
```

Branch naming convention:

| Prefix | When |
|--------|------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code improvement |
| `docs/` | Documentation |

### 3. Develop

```bash
# Run dev mode (with debug logs)
pnpm dev

# Lint
pnpm lint

# Format
pnpm format

# Build check
pnpm build
```

### 4. Commit

This project uses **Conventional Commits**. Husky + lint-staged automatically run ESLint and Prettier on commit.

```
type(scope): short description
```

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change without behavior change |
| `docs` | Documentation only |
| `chore` | Config, deps, CI, tooling |
| `style` | Formatting, whitespace (no logic change) |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |

**Rules:**

- Present tense, imperative mood: `add` not `added`
- No trailing period
- Header only — no body, no bullet list
- Keep under 72 characters

```bash
# Examples
git commit -m "feat(telegram): add inline keyboard support"
git commit -m "fix(hook): handle missing session id"
git commit -m "refactor(i18n): extract locale constants"
```

### 5. Create a Pull Request

```bash
git push origin feat/feature-name
```

Open a PR against the `main` branch on GitHub. In the PR description, include:

- **Problem**: What does this PR solve?
- **Solution**: What was done?
- **Impact**: What parts are affected?

## Coding Standards

### Principles

- **No over-engineering.** Only implement what is needed right now
- **Reuse before creating.** Search for existing modules and utilities before writing new code
- **No comments.** Code must be self-explanatory through clear naming and small focused functions. If a comment feels necessary, rewrite the code for clarity

### Code Style

- TypeScript strict mode
- ESM modules (`import`/`export`)
- Double quotes, semicolons, 2-space indent
- Trailing comma `es5`
- Print width 100
- Auto-sorted imports: builtin → third-party → relative

### i18n

When adding user-facing strings, you must add them to **all 3 locale files** and the type definition:

- `src/i18n/en.ts`
- `src/i18n/vi.ts`
- `src/i18n/zh.ts`
- `src/i18n/types.ts` (type definition)

### Error Handling

- Always `.catch()` fire-and-forget promises
- Wrap `setInterval` callbacks in try/catch
- Escape shell metacharacters when using `execSync` with user input

## Project Structure

```
src/
├── agent/       → Agent plugins (Claude Code, Codex CLI, Cursor CLI)
├── channel/     → Communication channels (Telegram, Discord, Slack)
├── commands/    → CLI commands (setup, project, uninstall)
├── i18n/        → Internationalization (en, vi, zh)
├── server/      → HTTP server for webhooks
├── tmux/        → tmux session management
├── utils/       → Shared utilities
└── index.ts     → Entry point
web/             → Landing page (Astro)
docs/            → Technical documentation
```

## Adding a New Agent

The project uses a plugin architecture. To add a new agent:

1. Create a directory under `src/agent/`
2. Implement the agent interface (hook install/uninstall, event parsing)
3. Register the agent in the agents list
4. Add locale strings for all 3 languages

## Adding a New Channel

Similar to agents, channels also use the plugin architecture:

1. Create a directory under `src/channel/`
2. Implement the channel interface (send message, handle callback)
3. Register the channel
4. Add locale strings for all 3 languages

## License

Your contributions will be released under the [MIT License](./LICENSE).
