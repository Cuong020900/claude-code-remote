---
title: "Unified CLI entry point (ccd)"
description: "Single CLI with subcommands: start (daemon), open (daemon + browser), setup (hooks)"
status: complete
priority: P1
effort: 2h
branch: main
tags: [cli, dx, phase-1]
created: 2026-03-15
---

# Phase 1.5 — Unified CLI (`ccd`)

## Overview

Single CLI binary `ccd` replacing separate `pnpm dev` / `cd frontend && pnpm dev` workflow.
Inspired by `openclaw gateway open` pattern.

## Subcommands

| Command | Behavior |
|---------|----------|
| `ccd start` | Start backend daemon on :3500 (default if no subcommand) |
| `ccd open` | Start backend + frontend, open browser to :3000 |
| `ccd setup` | Install CCD hooks into `~/.claude/settings.json` |
| `ccd stop` | (future) Kill running CCD processes |
| `ccd status` | (future) Show daemon/frontend status |

## Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/cli.ts` | Arg parser, subcommand dispatch | ~80 |
| `src/cli-open-handler.ts` | Spawn frontend, open browser, manage child procs | ~90 |

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `bin` field, add `"ccd"` script |
| `server.ts` | Export `main()` so CLI can import it |
| `tsconfig.json` | Add `src/cli.ts` to include (already covered by `src/**/*.ts`) |

## Implementation Steps

1. **Export `main()` from `server.ts`** -- Change `main()` to a named export. Keep the `main().catch(...)` self-invocation guarded by a flag so `server.ts` still works standalone. OR: move the `.catch()` call behind `import.meta.url` check.

2. **Create `src/cli.ts`** -- Parse `process.argv` manually (no deps, KISS). Map subcommands:
   - No args or `start` -> import and call `main()` from `server.ts`
   - `open` -> call `main()`, then spawn frontend + open browser
   - `setup` -> call `install()` from `hook-installer.ts`
   - `--help` / unknown -> print usage

3. **Create `src/cli-open-handler.ts`** -- Exports `startFrontendAndOpenBrowser()`:
   - `spawn('pnpm', ['dev'], { cwd: 'frontend/', stdio: 'pipe' })` to start Next.js
   - Watch stdout for "Ready" or `:3000`, then open browser via platform command (`open` on macOS, `xdg-open` on Linux)
   - Forward SIGINT/SIGTERM to child process for clean shutdown
   - Pipe frontend logs through pino or prefix with `[frontend]`

4. **Update `package.json`**:
   ```json
   "bin": { "ccd": "./dist/cli.js" },
   "scripts": {
     "ccd": "tsx src/cli.ts",
     "ccd:open": "tsx src/cli.ts open",
     ...existing scripts
   }
   ```

5. **Update `server.ts`** -- Guard auto-execution:
   ```ts
   export { main };
   // Self-execute only when run directly
   const isDirectRun = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
   if (isDirectRun) main().catch(...);
   ```

6. **Test manually**: `pnpm ccd`, `pnpm ccd open`, `pnpm ccd setup`

## Success Criteria

- [x] `pnpm ccd` starts backend only (same as `pnpm dev`)
- [x] `pnpm ccd open` starts backend + frontend + opens browser
- [x] `pnpm ccd setup` installs hooks
- [x] Ctrl+C cleanly kills all child processes (process 'exit' event + SIGTERM to child)
- [x] `ccd --help` prints usage
- [x] No new dependencies added
- [x] All files < 200 lines (cli.ts: 74, cli-open-handler.ts: 85)

## Risk Assessment

- **Frontend spawn reliability**: Next.js startup detection via stdout parsing may be fragile. Mitigation: use a simple timeout fallback (open browser after 5s if no "Ready" detected).
- **Cross-platform `open` command**: macOS uses `open`, Linux uses `xdg-open`. Mitigation: detect platform via `process.platform`.
- **Port conflicts**: Backend or frontend port already in use. Mitigation: catch EADDRINUSE and print helpful error.
