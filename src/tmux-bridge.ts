// tmux bridge — wrapper around tmux CLI for session management

import { execSync } from 'node:child_process';
import { logger } from './logger.js';

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function escapeTmuxText(text: string): string {
  const cleaned = text.replace(/\r/g, '');
  const escaped = cleaned
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/;/g, '\\;');
  return `"${escaped}"`;
}

function busyWaitMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // spin
  }
}

class TmuxBridge {
  private available: boolean | null = null;

  /** Check if tmux binary is available */
  isTmuxAvailable(): boolean {
    if (this.available !== null) return this.available;
    try {
      execSync('tmux -V', { stdio: 'pipe', timeout: 3000 });
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }

  /** Send text to a tmux pane, followed by submit keys (e.g. Enter) */
  sendKeys(target: string, text: string, submitKeys: string[] = ['Enter']): void {
    const tgt = escapeShellArg(target);
    const collapsed = text.replace(/\n+/g, ' ').trim();
    if (collapsed.length === 0) return;

    const escaped = escapeTmuxText(collapsed);
    execSync(`tmux send-keys -t ${tgt} -l ${escaped}`, {
      stdio: 'pipe',
      timeout: 5000,
    });

    busyWaitMs(100);

    for (let i = 0; i < submitKeys.length; i++) {
      if (i > 0) busyWaitMs(150);
      execSync(`tmux send-keys -t ${tgt} ${escapeShellArg(submitKeys[i]!)}`, {
        stdio: 'pipe',
        timeout: 5000,
      });
    }
  }

  /** Send a special key (Enter, y, n, Escape, etc.) */
  sendSpecialKey(target: string, key: string): void {
    const tgt = escapeShellArg(target);
    execSync(`tmux send-keys -t ${tgt} ${escapeShellArg(key)}`, {
      stdio: 'pipe',
      timeout: 5000,
    });
  }

  /** Capture visible output from a tmux pane */
  capturePane(target: string, lines = 50): string {
    const tgt = escapeShellArg(target);
    return execSync(`tmux capture-pane -t ${tgt} -p -S -${lines}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
  }

  /** Create a new tmux pane in the CCD session */
  createPane(sessionName: string, cwd: string): string {
    const dir = escapeShellArg(cwd);
    const fmt = escapeShellArg('#{session_name}:#{window_index}.#{pane_index}');
    const name = escapeShellArg(sessionName);

    if (!this.hasSession(sessionName)) {
      const target = execSync(
        `tmux new-session -d -s ${name} -c ${dir} -P -F ${fmt}`,
        { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 },
      ).trim();
      return target || `${sessionName}:0.0`;
    }

    // Get the first window index for this session (not always 0)
    let windowId = '0';
    try {
      const winList = execSync(
        `tmux list-windows -t ${name} -F '#{window_index}'`,
        { encoding: 'utf-8', stdio: 'pipe', timeout: 3000 },
      ).trim();
      windowId = winList.split('\n')[0]?.trim() || '0';
    } catch {
      // fallback to 0
    }

    const tgt = escapeShellArg(`${sessionName}:${windowId || '0'}`);
    const target = execSync(
      `tmux split-window -t ${tgt} -c ${dir} -P -F ${fmt}`,
      { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 },
    ).trim();

    // Rebalance pane layout
    try {
      execSync(`tmux select-layout -t ${tgt} tiled`, {
        stdio: 'pipe',
        timeout: 3000,
      });
    } catch {
      // layout command can fail if only one pane
    }

    return target || `${sessionName}:0.0`;
  }

  /** Kill a specific tmux pane */
  killPane(target: string): void {
    const tgt = escapeShellArg(target);
    try {
      execSync(`tmux kill-pane -t ${tgt}`, { stdio: 'pipe', timeout: 5000 });
    } catch (err) {
      logger.warn({ target, err }, 'Failed to kill tmux pane');
    }
  }

  /** Check if a tmux session exists */
  hasSession(name: string): boolean {
    try {
      execSync(`tmux has-session -t ${escapeShellArg(name)}`, {
        stdio: 'pipe',
        timeout: 3000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const tmuxBridge = new TmuxBridge();
