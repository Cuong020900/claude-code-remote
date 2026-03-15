package prompt

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// BuildSystemPrompt constructs the system prompt with shell context.
func BuildSystemPrompt(shell string) string {
	cwd, _ := os.Getwd()
	history := getRecentHistory(shell, 10)

	return fmt.Sprintf(`You are a CLI command generator. Convert natural language to shell commands.

CRITICAL: You MUST respond with ONLY a JSON object. No other text, no explanation outside JSON, no markdown.
ALWAYS respond in English regardless of the input language.

Required JSON format (nothing else):
{"command": "the shell command", "explanation": "1-2 sentence explanation"}

Context:
- OS: %s (%s)
- Shell: %s
- CWD: %s
- Recent commands:
%s`, runtime.GOOS, runtime.GOARCH, shell, cwd, history)
}

// BuildExplainPrompt constructs a prompt for explaining a command.
func BuildExplainPrompt(shell string) string {
	return fmt.Sprintf(`You are a command explainer. Explain what a shell command does.

CRITICAL: You MUST respond with ONLY a JSON object. No other text.
ALWAYS respond in English.

Required JSON format (nothing else):
{"explanation": "detailed explanation of the command"}

Context:
- OS: %s (%s)
- Shell: %s`, runtime.GOOS, runtime.GOARCH, shell)
}

func getRecentHistory(shell string, n int) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "  (unavailable)"
	}

	var historyPath string
	switch shell {
	case "fish":
		historyPath = filepath.Join(home, ".local", "share", "fish", "fish_history")
	case "zsh":
		historyPath = filepath.Join(home, ".zsh_history")
	default:
		historyPath = filepath.Join(home, ".bash_history")
	}

	// Try reading history file directly
	data, err := os.ReadFile(historyPath)
	if err != nil {
		// Fallback: try `history` command
		out, err := exec.Command(shell, "-c", "history | tail -"+fmt.Sprint(n)).Output()
		if err != nil {
			return "  (unavailable)"
		}
		return indent(string(out))
	}

	lines := strings.Split(strings.TrimSpace(string(data)), "\n")

	// For fish history, extract command lines (- cmd: prefix)
	if shell == "fish" {
		var cmds []string
		for _, line := range lines {
			if strings.HasPrefix(line, "- cmd: ") {
				cmds = append(cmds, strings.TrimPrefix(line, "- cmd: "))
			}
		}
		lines = cmds
	}

	// For zsh, strip leading metadata (: timestamp:0; prefix)
	if shell == "zsh" {
		var cleaned []string
		for _, line := range lines {
			if idx := strings.Index(line, ";"); idx >= 0 && strings.HasPrefix(line, ":") {
				cleaned = append(cleaned, line[idx+1:])
			} else {
				cleaned = append(cleaned, line)
			}
		}
		lines = cleaned
	}

	// Take last N
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}

	if len(lines) == 0 {
		return "  (no recent commands)"
	}

	return indent(strings.Join(lines, "\n"))
}

func indent(s string) string {
	lines := strings.Split(strings.TrimSpace(s), "\n")
	for i, l := range lines {
		lines[i] = "  " + l
	}
	return strings.Join(lines, "\n")
}
