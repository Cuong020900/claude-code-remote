// Central configuration for Claude Code Dashboard (CCD)

import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// --- Paths ---

const HOME = homedir();

export const paths = {
  /** CCD data directory */
  ccdDir: join(HOME, '.ccd'),
  /** Hook scripts installed here */
  hooksDir: join(HOME, '.ccd', 'hooks'),
  /** Hook library directory */
  hooksLibDir: join(HOME, '.ccd', 'hooks', 'lib'),
  /** Secret file for hook authentication */
  secretFile: join(HOME, '.ccd', 'secret'),
  /** Claude Code settings.json */
  claudeSettings: join(HOME, '.claude', 'settings.json'),
  /** Claude Code projects directory (conversation history) */
  claudeProjects: join(HOME, '.claude', 'projects'),
} as const;

// --- Config values ---

export const config = {
  /** HTTP server port */
  port: parseInt(process.env.CCD_PORT || '3500', 10),
  /** Hostname to bind */
  host: process.env.CCD_HOST || '127.0.0.1',
  /** Hook marker to identify CCD hooks in settings.json */
  hookMarker: '.ccd/hooks/',
  /** tmux session name for CCD-managed panes */
  tmuxSessionName: process.env.CCD_TMUX_SESSION || 'ccd',
} as const;

// --- Secret management ---

/** Ensure ~/.ccd/ directory exists */
export function ensureCcdDir(): void {
  for (const dir of [paths.ccdDir, paths.hooksDir, paths.hooksLibDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/** Get or generate the shared secret for hook authentication */
export function getOrCreateSecret(): string {
  ensureCcdDir();
  if (existsSync(paths.secretFile)) {
    return readFileSync(paths.secretFile, 'utf-8').trim();
  }
  const secret = randomBytes(32).toString('hex');
  writeFileSync(paths.secretFile, secret, { mode: 0o600 });
  return secret;
}
