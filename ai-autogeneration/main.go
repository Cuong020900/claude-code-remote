package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/trancuong/ai-autogeneration/internal/client"
	"github.com/trancuong/ai-autogeneration/internal/config"
	"github.com/trancuong/ai-autogeneration/internal/prompt"
	"github.com/trancuong/ai-autogeneration/internal/runner"
)

// ANSI color helpers
const (
	colorReset  = "\033[0m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorCyan   = "\033[36m"
	colorDim    = "\033[2m"
	colorBold   = "\033[1m"
)

var (
	flagYes     bool
	flagDryRun  bool
	flagExplain bool
	flagExplainCmd bool
	flagShell   string
	flagModel   string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "ai [query...]",
		Short: "Translate natural language to shell commands using AI",
		Long: `ai - AI-powered command completion for your terminal.

Examples:
  ai "list all files with sizes"       → ls -lah
  ai find large files over 100MB       → find . -size +100M
  ai -y "current date"                 → auto-run date
  ai -n "compress src folder"          → show command only
  ai -x "tar -czf archive.tar.gz ."   → explain existing command`,
		Args: cobra.MinimumNArgs(1),
		RunE: run,
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	rootCmd.Flags().BoolVarP(&flagYes, "yes", "y", false, "Auto-run without confirmation")
	rootCmd.Flags().BoolVarP(&flagDryRun, "dry-run", "n", false, "Show command only, don't run")
	rootCmd.Flags().BoolVarP(&flagExplain, "explain", "e", false, "Show detailed explanation")
	rootCmd.Flags().BoolVarP(&flagExplainCmd, "explain-cmd", "x", false, "Explain an existing command")
	rootCmd.Flags().StringVar(&flagShell, "shell", "", "Override shell (bash, zsh, fish)")
	rootCmd.Flags().StringVar(&flagModel, "model", "", "Override Claude model")

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "%serror:%s %v\n", colorYellow, colorReset, err)
		os.Exit(1)
	}
}

func run(cmd *cobra.Command, args []string) error {
	query := strings.Join(args, " ")

	// Load config
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// Apply flag overrides
	if flagShell != "" {
		cfg.Shell = flagShell
	}
	if flagModel != "" {
		cfg.Model = flagModel
	}

	// Create client
	cl := client.New(cfg.BaseURL, cfg.APIKey, cfg.Model)

	// Mode: explain existing command
	if flagExplainCmd {
		return explainCommand(cl, cfg.Shell, query)
	}

	// Mode: generate command
	return generateAndRun(cl, cfg.Shell, query)
}

func generateAndRun(cl *client.Client, shell, query string) error {
	sysPrompt := prompt.BuildSystemPrompt(shell)

	fmt.Fprintf(os.Stderr, "%s⏳ Thinking...%s\n", colorDim, colorReset)

	result, err := cl.GenerateCommand(sysPrompt, query)
	if err != nil {
		return fmt.Errorf("generation failed: %w", err)
	}

	// Display command
	fmt.Fprintf(os.Stderr, "\n%s%s→ %s%s%s\n", colorBold, colorGreen, result.Command, colorReset, colorReset)

	if flagExplain || result.Explanation != "" {
		fmt.Fprintf(os.Stderr, "%s%s%s\n", colorDim, result.Explanation, colorReset)
	}

	// Dry-run: just show, don't run
	if flagDryRun {
		// Print to stdout for piping
		fmt.Println(result.Command)
		return nil
	}

	// Auto-run
	if flagYes {
		fmt.Fprintf(os.Stderr, "\n")
		exitCode := runner.Run(shell, result.Command)
		os.Exit(exitCode)
	}

	// Interactive confirmation
	fmt.Fprintf(os.Stderr, "\n%sRun? [Y/n/e] %s", colorCyan, colorReset)
	reader := bufio.NewReader(os.Stdin)
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))

	switch answer {
	case "", "y", "yes":
		exitCode := runner.Run(shell, result.Command)
		os.Exit(exitCode)
	case "e", "edit":
		// Print command so user can copy/edit
		fmt.Println(result.Command)
	default:
		fmt.Fprintf(os.Stderr, "%sAborted.%s\n", colorDim, colorReset)
	}

	return nil
}

func explainCommand(cl *client.Client, shell, command string) error {
	sysPrompt := prompt.BuildExplainPrompt(shell)

	fmt.Fprintf(os.Stderr, "%s⏳ Analyzing...%s\n", colorDim, colorReset)

	result, err := cl.ExplainCommand(sysPrompt, command)
	if err != nil {
		return fmt.Errorf("explanation failed: %w", err)
	}

	fmt.Fprintf(os.Stderr, "\n%s%s%s\n", colorCyan, result.Explanation, colorReset)
	return nil
}
