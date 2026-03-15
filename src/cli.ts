#!/usr/bin/env node
// CCD CLI — Unified entry point
// Usage:
//   ccd             Start backend daemon (same as `ccd start`)
//   ccd start       Start backend daemon on :3500
//   ccd open        Start daemon + frontend, open browser
//   ccd setup       Install CCD hooks into ~/.claude/settings.json
//   ccd --help      Print this usage

import { logger } from './logger.js';

const USAGE = `
CCD — Claude Code Dashboard

Usage:
  ccd [command]

Commands:
  start    Start the CCD backend daemon (default)
  open     Start backend + frontend dev server and open browser
  setup    Install CCD hooks into ~/.claude/settings.json
  --help   Print this help

Environment variables:
  CCD_PORT              Backend port (default: 3500)
  CCD_HOST              Backend host (default: 127.0.0.1)
  CCD_ALLOWED_ORIGINS   Comma-separated CORS origins (default: http://localhost:3000)
`.trim();

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? 'start';

  if (cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  if (cmd === 'setup') {
    const { install, isInstalled } = await import('./hook-installer.js');
    if (isInstalled()) {
      logger.info('CCD hooks already installed');
    } else {
      install();
      logger.info('CCD hooks installed successfully');
    }
    return;
  }

  if (cmd === 'start' || cmd === 'open') {
    // Start backend
    const { main } = await import('../server.js');
    await main();

    if (cmd === 'open') {
      const { startFrontendAndOpenBrowser } = await import('./cli-open-handler.js');
      const cleanup = startFrontendAndOpenBrowser();

      // Use 'exit' event so cleanup runs even after server's shutdown calls process.exit()
      process.on('exit', cleanup);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}\n`);
  console.log(USAGE);
  process.exit(1);
}

run().catch((err) => {
  logger.error(err, 'CCD failed to start');
  process.exit(1);
});
