# ai — AI Command Completion for Terminal

Translate natural language into shell commands using Claude.

```
$ ai "list all files with sizes"
⏳ Thinking...

→ ls -lah
Lists all files in the current directory with human-readable sizes.

Run? [Y/n/e]
```

## Install

```bash
# Build
cd ai-autogeneration
make build

# Install to /usr/local/bin
make install

# Or manually
go build -o ai . && cp ai /usr/local/bin/
```

## Usage

```bash
ai "list all files"              # Generate + confirm + run
ai -y "current date"             # Auto-run (skip confirmation)
ai -n "compress src folder"      # Dry-run (show command only)
ai -e "find large files"         # Show command + explanation
ai -x "tar -czf a.tar.gz ."     # Explain an existing command
ai --shell bash "list files"     # Force shell
ai --model claude-opus "task"    # Override model
```

### Flags

| Flag | Short | Description |
|---|---|---|
| `--yes` | `-y` | Auto-run without confirmation |
| `--dry-run` | `-n` | Show command only, don't run |
| `--explain` | `-e` | Show detailed explanation |
| `--explain-cmd` | `-x` | Explain an existing command |
| `--shell` | | Override shell (bash, zsh, fish) |
| `--model` | | Override Claude model |

## Configuration

Reads from `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-..."
  }
}
```

Environment variables override settings.json:
- `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
