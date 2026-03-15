package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Client is a minimal Claude Messages API client.
type Client struct {
	baseURL    string
	apiKey     string
	model      string
	httpClient *http.Client
}

// CommandResult is the parsed response for command generation.
type CommandResult struct {
	Command     string `json:"command"`
	Explanation string `json:"explanation"`
}

// ExplainResult is the parsed response for command explanation.
type ExplainResult struct {
	Explanation string `json:"explanation"`
}

// message types for the Messages API
type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type messagesRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system,omitempty"`
	Messages  []message `json:"messages"`
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type messagesResponse struct {
	Content []contentBlock `json:"content"`
	Error   *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// New creates a new Claude API client.
func New(baseURL, apiKey, model string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		model:   model,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// GenerateCommand sends a natural language query and returns a command suggestion.
func (c *Client) GenerateCommand(systemPrompt, userQuery string) (*CommandResult, error) {
	// Wrap the user query with explicit JSON instruction
	wrappedQuery := fmt.Sprintf(
		`Convert this to a single shell command. Reply with ONLY a JSON object, no other text.
Format: {"command": "the command", "explanation": "brief explanation"}

Task: %s`, userQuery)

	text, err := c.callMessages(systemPrompt, wrappedQuery, `{"command": "`)
	if err != nil {
		return nil, err
	}

	// Prepend the prefill back since the API returns continuation
	fullJSON := `{"command": "` + text

	var result CommandResult
	if err := json.Unmarshal([]byte(fullJSON), &result); err != nil {
		// Fallback: try parsing the raw text
		if err2 := json.Unmarshal([]byte(text), &result); err2 != nil {
			// Fallback: extract command from freeform text
			cmd := extractCommandFromText(text)
			if cmd == "" {
				cmd = extractCommandFromText(fullJSON)
			}
			if cmd != "" {
				return &CommandResult{Command: cmd, Explanation: "(extracted from response)"}, nil
			}
			return nil, fmt.Errorf("could not extract command from response: %s", text)
		}
	}

	if result.Command == "" {
		return nil, fmt.Errorf("no command in response: %s", text)
	}

	return &result, nil
}

// ExplainCommand sends a command and returns an explanation.
func (c *Client) ExplainCommand(systemPrompt, command string) (*ExplainResult, error) {
	wrappedQuery := fmt.Sprintf(
		`Explain this shell command in plain English. Reply with ONLY a JSON object.
Format: {"explanation": "detailed explanation"}

Command: %s`, command)

	text, err := c.callMessages(systemPrompt, wrappedQuery, "")
	if err != nil {
		return nil, err
	}

	var result ExplainResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		// Fallback: use the raw text as the explanation
		return &ExplainResult{Explanation: strings.TrimSpace(text)}, nil
	}

	return &result, nil
}

func (c *Client) callMessages(system, userContent, assistantPrefill string) (string, error) {
	messages := []message{
		{Role: "user", Content: userContent},
	}

	// Add assistant prefill to force output format
	if assistantPrefill != "" {
		messages = append(messages, message{Role: "assistant", Content: assistantPrefill})
	}

	reqBody := messagesRequest{
		Model:     c.model,
		MaxTokens: 1024,
		System:    system,
		Messages:  messages,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.baseURL + "/v1/messages"
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned %d: %s", resp.StatusCode, string(respBytes))
	}

	if len(respBytes) == 0 {
		return "", fmt.Errorf("empty response body from API")
	}

	var msgResp messagesResponse
	if err := json.Unmarshal(respBytes, &msgResp); err != nil {
		return "", fmt.Errorf("failed to parse API response: %w\nRaw: %s", err, string(respBytes))
	}

	if msgResp.Error != nil {
		return "", fmt.Errorf("API error: %s — %s", msgResp.Error.Type, msgResp.Error.Message)
	}

	// Collect text from all content blocks
	var texts []string
	for _, block := range msgResp.Content {
		if block.Type == "text" && block.Text != "" {
			texts = append(texts, block.Text)
		}
	}

	if len(texts) == 0 {
		return "", fmt.Errorf("no text content in response.\nFull response: %s", string(respBytes))
	}

	text := strings.Join(texts, "")
	text = stripCodeFences(text)
	return strings.TrimSpace(text), nil
}

// stripCodeFences removes ```json ... ``` or ``` ... ``` wrappers
func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		if idx := strings.Index(s, "\n"); idx >= 0 {
			s = s[idx+1:]
		}
		if idx := strings.LastIndex(s, "```"); idx >= 0 {
			s = s[:idx]
		}
	}
	return strings.TrimSpace(s)
}

// extractCommandFromText tries to find a shell command in freeform text.
func extractCommandFromText(text string) string {
	lines := strings.Split(text, "\n")

	// 1. Look for JSON embedded in the text
	jsonRe := regexp.MustCompile(`\{[^}]*"command"\s*:\s*"([^"]+)"[^}]*\}`)
	if m := jsonRe.FindStringSubmatch(text); len(m) > 1 {
		return m[1]
	}

	// 2. Look for code blocks: ```\ncommand\n```
	inCode := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "```") {
			if inCode {
				break
			}
			inCode = true
			continue
		}
		if inCode && trimmed != "" {
			return trimmed
		}
	}

	// 3. Look for $ prefixed lines (shell examples)
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "$ ") {
			return strings.TrimPrefix(trimmed, "$ ")
		}
	}

	// 4. Look for lines starting with common commands
	commonCmds := []string{"ls", "cd", "find", "grep", "cat", "echo", "mkdir", "rm", "cp", "mv",
		"tar", "curl", "wget", "du", "df", "ps", "kill", "chmod", "chown", "ssh",
		"git", "docker", "npm", "pip", "brew", "apt", "yum", "sed", "awk", "sort",
		"head", "tail", "wc", "xargs", "tee", "diff", "touch", "ln", "rsync"}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		for _, cmd := range commonCmds {
			if strings.HasPrefix(trimmed, cmd+" ") || trimmed == cmd {
				return trimmed
			}
		}
	}

	return ""
}

