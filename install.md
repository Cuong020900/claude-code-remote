# Installing CCD as a Global CLI

## Prerequisites

- [Bun](https://bun.sh) v1.0+

## Install

```bash
# Clone the repo
git clone <repo-url> && cd claude-code-dashboard

# Install dependencies
bun install

# Build TypeScript
bun run build

# Link as global CLI
bun link
```

After this, the `ccd` command is available globally.

## Usage

```bash
ccd              # Start backend daemon on :3500
ccd open         # Start backend + frontend, open browser
ccd setup        # Install CCD hooks into ~/.claude/settings.json
ccd --help       # Print help
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CCD_PORT` | `3500` | Backend port |
| `CCD_HOST` | `127.0.0.1` | Backend host |
| `CCD_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

## Uninstall

```bash
bun unlink claude-code-dashboard
```
