// CCD Server — Entry point for Claude Code Dashboard backend

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config, getOrCreateSecret } from './src/config.js';
import { createHookRouter } from './src/hook-receiver.js';
import { wsHub } from './src/ws-hub.js';
import { install, isInstalled } from './src/hook-installer.js';
import { tmuxBridge } from './src/tmux-bridge.js';
import { logger } from './src/logger.js';
import { createChatRouter } from './src/routes/chat.js';
import { createSessionsRouter } from './src/routes/sessions.js';
import { createHistoryRouter } from './src/routes/history.js';
import { createProjectsRouter } from './src/routes/projects.js';

export async function main(): Promise<void> {
  // 1. Generate or load secret
  const secret = getOrCreateSecret();
  logger.info('Secret loaded');

  // 2. Install hooks if not already installed
  if (!isInstalled()) {
    install();
  } else {
    logger.info('CCD hooks already installed');
  }

  // 3. Check tmux availability
  if (tmuxBridge.isTmuxAvailable()) {
    logger.info('tmux detected');
  } else {
    logger.warn('tmux not found — session management will be limited');
  }

  // 4. Create Express app
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // 5. CORS — allow frontend at localhost:3000
  const allowedOrigins = (process.env.CCD_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CCD-Secret');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 6. Mount hook receiver routes
  app.use(createHookRouter(secret));

  // 7. Mount Phase 1 API routes
  app.use(createChatRouter());
  app.use(createSessionsRouter());
  app.use(createHistoryRouter());
  app.use(createProjectsRouter());

  // 8. JSON parse error handler (must be after routes)
  app.use(
    (
      err: Error & { status?: number; type?: string },
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'invalid_json' });
        return;
      }
      next(err);
    },
  );

  // 9. Create HTTP server & attach WebSocket
  const server = createServer(app);
  wsHub.attach(server);

  // 10. Start listening
  server.listen(config.port, config.host, () => {
    logger.info(`CCD backend listening on http://${config.host}:${config.port}`);
    logger.info('Waiting for Claude Code hook events...');
  });

  // Graceful shutdown
  const shutdown = (): void => {
    logger.info('Shutting down...');
    wsHub.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Self-execute only when run directly (not when imported by cli.ts)
const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((err) => {
    logger.error(err, 'Failed to start CCD');
    process.exit(1);
  });
}
