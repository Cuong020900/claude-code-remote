package runner

import (
	"fmt"
	"os"
	"os/exec"
)

// Run executes a command string via the specified shell, streaming output.
// Returns the exit code.
func Run(shell, command string) int {
	shellPath := findShell(shell)

	cmd := exec.Command(shellPath, "-c", command)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode()
		}
		fmt.Fprintf(os.Stderr, "exec error: %v\n", err)
		return 1
	}

	return 0
}

func findShell(name string) string {
	// Try to find the full path
	path, err := exec.LookPath(name)
	if err == nil {
		return path
	}
	// Fallback: use name directly
	return name
}
