package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the resolved configuration for the AI tool.
type Config struct {
	BaseURL string
	APIKey  string
	Model   string
	Shell   string
}

// claudeSettings mirrors ~/.claude/settings.json structure.
type claudeSettings struct {
	Env map[string]string `json:"env"`
}

// Load reads configuration from ~/.claude/settings.json + env overrides.
func Load() (*Config, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("cannot find home directory: %w", err)
	}

	cfg := &Config{
		BaseURL: "https://api.anthropic.com",
		Model:   "claude-sonnet-4-20250514",
		Shell:   detectShell(),
	}

	// Read ~/.claude/settings.json
	settingsPath := filepath.Join(home, ".claude", "settings.json")
	data, err := os.ReadFile(settingsPath)
	if err == nil {
		var s claudeSettings
		if jsonErr := json.Unmarshal(data, &s); jsonErr == nil {
			if v := s.Env["ANTHROPIC_BASE_URL"]; v != "" {
				cfg.BaseURL = v
			}
			if v := s.Env["ANTHROPIC_AUTH_TOKEN"]; v != "" {
				cfg.APIKey = v
			}
			if v := s.Env["ANTHROPIC_API_KEY"]; v != "" {
				cfg.APIKey = v
			}
			if v := s.Env["ANTHROPIC_DEFAULT_SONNET_MODEL"]; v != "" {
				cfg.Model = v
			}
		}
	}

	// Env vars override settings.json
	if v := os.Getenv("ANTHROPIC_BASE_URL"); v != "" {
		cfg.BaseURL = v
	}
	if v := os.Getenv("ANTHROPIC_API_KEY"); v != "" {
		cfg.APIKey = v
	}
	if v := os.Getenv("ANTHROPIC_AUTH_TOKEN"); v != "" {
		cfg.APIKey = v
	}

	if cfg.APIKey == "" {
		return nil, fmt.Errorf("no API key found — set ANTHROPIC_API_KEY or configure ~/.claude/settings.json")
	}

	return cfg, nil
}

func detectShell() string {
	if s := os.Getenv("SHELL"); s != "" {
		return filepath.Base(s)
	}
	return "sh"
}
