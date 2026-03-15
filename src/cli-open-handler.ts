// Handles `ccd open`: spawns Next.js frontend and opens browser
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from './logger.js';

const FRONTEND_URL = 'http://localhost:3000';
const FRONTEND_DIR = resolve(process.cwd(), 'frontend');
const READY_PATTERN = /ready|started server|localhost:3000/i;
// Fallback: open browser after this many ms even if "Ready" wasn't detected
const BROWSER_OPEN_TIMEOUT_MS = 8_000;

/** Open a URL in the default system browser (macOS / Linux) */
function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    execFileSync(cmd, [url], { stdio: 'ignore' });
    logger.info(`Opened browser: ${url}`);
  } catch {
    logger.warn(`Could not open browser automatically. Visit: ${url}`);
  }
}

/**
 * Spawn the Next.js frontend dev server and open browser once ready.
 * Returns cleanup function to kill frontend on shutdown.
 */
export function startFrontendAndOpenBrowser(): () => void {
  if (!existsSync(FRONTEND_DIR)) {
    logger.warn(`Frontend directory not found: ${FRONTEND_DIR}. Skipping frontend start.`);
    return () => {};
  }

  logger.info(`Starting frontend dev server in ${FRONTEND_DIR}`);

  const child = spawn('pnpm', ['dev'], {
    cwd: FRONTEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  let browserOpened = false;

  const tryOpenBrowser = () => {
    if (!browserOpened) {
      browserOpened = true;
      openBrowser(FRONTEND_URL);
    }
  };

  // Parse stdout for "Ready" signal
  child.stdout?.on('data', (chunk: Buffer) => {
    const line = chunk.toString();
    process.stdout.write(`[frontend] ${line}`);
    if (READY_PATTERN.test(line)) {
      tryOpenBrowser();
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[frontend] ${chunk.toString()}`);
  });

  child.on('error', (err) => {
    logger.error({ err }, 'Failed to start frontend');
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      logger.warn(`Frontend process exited with code ${code}`);
    }
  });

  // Fallback: open browser after timeout regardless of stdout
  const fallbackTimer = setTimeout(tryOpenBrowser, BROWSER_OPEN_TIMEOUT_MS);

  // Return cleanup — called on SIGINT/SIGTERM
  return () => {
    clearTimeout(fallbackTimer);
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };
}
