# Code Review: Unified `ccd` CLI Feature

**Date:** 2026-03-15
**Reviewer:** code-reviewer
**Score:** 7.5 / 10

---

## Scope

- Files: `src/cli.ts` (new, 78 lines), `src/cli-open-handler.ts` (new, 80 lines), `server.ts` (modified, 114 lines), `package.json` (modified)
- LOC: ~310 across 4 files
- Focus: New CLI entry point with subcommands, server refactor to export `main()`
- TypeScript compilation: PASSES (no errors)

## Overall Assessment

Solid, simple implementation that follows KISS and YAGNI. The CLI is clean, the subcommand routing is straightforward, and the server refactor is minimal. Several medium-severity issues around signal handling, security, and robustness warrant attention before shipping.

---

## Critical Issues

**None.**

No security vulnerabilities, data loss risks, or breaking changes detected.

---

## High Priority

### H1. Command injection in `openBrowser()` (Security)

**File:** `src/cli-open-handler.ts:17`

```typescript
execSync(`${cmd} ${url}`, { stdio: 'ignore' });
```

The `url` variable is currently hardcoded to `http://localhost:3000`, so this is NOT exploitable today. However, if `FRONTEND_URL` is ever made configurable via env var, this becomes a shell injection vector. A URL like `http://x; rm -rf /` would execute arbitrary commands.

**Recommendation:** Use `execFileSync(cmd, [url])` instead of string interpolation through `execSync`. This is a one-line fix that eliminates the class of risk entirely.

### H2. Signal handler conflict between `server.ts` and `cli.ts` (Correctness)

**Files:** `server.ts:99-100`, `src/cli.ts:63-64`

`server.ts` uses `process.on('SIGINT', shutdown)` while `cli.ts` uses `process.once('SIGINT', handleExit)`. Both register handlers for the same signals. When `ccd open` runs:

1. `main()` registers `process.on('SIGINT', shutdown)` which calls `process.exit(0)` after closing the server
2. `cli.ts` registers `process.once('SIGINT', handleExit)` which calls `cleanup()` to kill the frontend child

The `process.on` handler in server.ts calls `process.exit()` directly, which may terminate before the `cli.ts` handler runs the frontend cleanup. Node.js executes signal listeners in registration order, so `shutdown()` fires first and calls `process.exit(0)`, potentially skipping the frontend kill.

**Impact:** Frontend child process may become orphaned on SIGINT.

**Recommendation:** Either:
- Move the `process.exit()` calls out of server shutdown and let cli.ts coordinate exit
- Or have `main()` return the `server` instance so cli.ts can manage shutdown holistically

### H3. `isEntryPoint` detection is fragile (Correctness)

**File:** `server.ts:104-106`

```typescript
const isEntryPoint =
  process.argv[1]?.endsWith('server.ts') ||
  process.argv[1]?.endsWith('server.js');
```

This fails if:
- The file is invoked via a symlink with a different name
- The path contains `server.ts` as a substring in a parent directory (unlikely but possible)
- The file is run via a loader/bundler that modifies `process.argv[1]`

**Recommendation:** Use `import.meta.url` comparison with `process.argv[1]` via `fileURLToPath`:

```typescript
import { fileURLToPath } from 'node:url';
const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);
```

This is the idiomatic ESM approach and handles symlinks correctly.

---

## Medium Priority

### M1. `FRONTEND_DIR` uses `process.cwd()` -- brittle for global installs (Robustness)

**File:** `src/cli-open-handler.ts:8`

```typescript
const FRONTEND_DIR = resolve(process.cwd(), 'frontend');
```

If the user runs `ccd open` from a directory other than the project root, this resolves to the wrong path. When installed globally via `npm install -g`, `cwd` will be whatever directory the user is in.

**Recommendation:** Resolve relative to the package root using `import.meta.url`:

```typescript
const FRONTEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
```

### M2. No validation that frontend directory exists before spawning (Robustness)

**File:** `src/cli-open-handler.ts:31`

If `frontend/` does not exist, `spawn('pnpm', ['dev'], { cwd: FRONTEND_DIR })` will emit an `error` event, which is logged but not surfaced well to the user.

**Recommendation:** Add an `existsSync(FRONTEND_DIR)` check before spawning and fail with a clear message.

### M3. `args.length === 0` check in cli.ts is redundant (Code quality)

**File:** `src/cli.ts:50`

```typescript
if (cmd === 'start' || cmd === 'open' || args.length === 0) {
```

When `args.length === 0`, `cmd` is already `'start'` due to line 32: `const cmd = args[0] ?? 'start'`. The `args.length === 0` branch is dead code.

**Recommendation:** Remove `|| args.length === 0` for clarity.

### M4. `cleanup()` return value not used (Minor)

**File:** `src/cli.ts:57`

```typescript
const cleanup = startFrontendAndOpenBrowser();
```

The function returns `() => void`. This is correct and used. No action needed -- just noting the pattern is clean.

---

## Low Priority

### L1. No `--version` flag

Standard CLI convention. Low priority for an internal tool.

### L2. Missing Windows support in `openBrowser`

**File:** `src/cli-open-handler.ts:15`

Only handles `darwin` and Linux (`xdg-open`). Windows would need `start`. Given the project requires tmux (Linux/macOS), this is acceptable.

### L3. CORS `Vary` header only set when origin matches

**File:** `server.ts:45`

The `Vary: Origin` header should always be set when the server inspects the `Origin` header, even for non-matching origins. Otherwise, shared caches may serve incorrect CORS responses. Minor since this is a localhost dev tool.

---

## Edge Cases Found by Scout

1. **Orphaned frontend process on crash:** If the backend crashes (unhandled exception), the frontend child process is NOT cleaned up because the cleanup function only runs on SIGINT/SIGTERM. Consider adding `process.on('exit', cleanup)` as a last-resort cleanup.

2. **Double `process.exit` on SIGTERM:** Both `server.ts` shutdown and `cli.ts` handleExit run on the same signal. The server shutdown calls `process.exit(0)` synchronously after a 5s timeout. If the exit handler in cli.ts hasn't run by then, the frontend is orphaned.

3. **`pnpm` not installed:** If `pnpm` is not on PATH when running `ccd open`, the spawn will fail with an ENOENT error. The `child.on('error')` handler logs it but the user gets no clear instruction.

4. **Port conflict:** If port 3000 is already in use, the frontend spawn fails but the browser still opens (via the 8s fallback timer) pointing to whatever is on port 3000.

---

## Positive Observations

- Clean KISS architecture -- no over-engineering
- Dynamic imports in cli.ts for code-splitting (setup path doesn't load express)
- Proper error handling in the top-level `run().catch()`
- Good use of `shell: false` in the child spawn (prevents injection)
- Graceful shutdown logic exists in server.ts
- Typecheck passes with zero errors
- File sizes well under 200 lines each
- Consistent logging via pino

---

## Recommended Actions (Priority Order)

1. **Fix `openBrowser` to use `execFileSync`** -- eliminates shell injection class (H1)
2. **Resolve signal handler conflict** -- prevent orphaned frontend (H2)
3. **Use `import.meta.url` for `isEntryPoint`** -- idiomatic ESM (H3)
4. **Resolve `FRONTEND_DIR` relative to package root** -- global install safety (M1)
5. **Add `existsSync` guard before frontend spawn** -- better error messages (M2)
6. **Remove dead `args.length === 0` condition** -- cleaner logic (M3)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | 100% (strict mode, no `any`) |
| Test Coverage | N/A (no tests for CLI yet) |
| Linting Issues | 0 (typecheck clean) |
| File Count | 4 files |
| Max File Size | 114 lines (server.ts) |

---

## Verdict

**7.5 / 10 -- Good with notable issues to address.**

The implementation is clean and follows KISS well. The critical path (subcommand routing, dynamic imports, frontend spawning) works correctly. However, the signal handler conflict (H2) is a real bug that will cause orphaned processes, and the shell injection pattern in `openBrowser` (H1) is a ticking time bomb even though it's safe today. Fix H1-H3 before merging; M1-M2 before any kind of distribution/packaging.
