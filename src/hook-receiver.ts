// Hook receiver — Express routes that receive POSTs from hook scripts

import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { bus, type HookEventType } from './event-bus.js';
import { logger } from './logger.js';

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Validate hook request body has a session_id string */
function hasValidBody(body: unknown): body is { session_id: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'session_id' in body &&
    typeof (body as Record<string, unknown>).session_id === 'string'
  );
}

// --- Hook route definitions (DRY) ---

const HOOK_ROUTES: Array<{ path: string; event: HookEventType; timeout?: number }> = [
  { path: '/hook/stop', event: 'hook:stop' },
  { path: '/hook/notification', event: 'hook:notification' },
  { path: '/hook/session-start', event: 'hook:session-start' },
  { path: '/hook/pretooluse', event: 'hook:pretooluse' },
  { path: '/hook/permission', event: 'hook:permission' },
];

export function createHookRouter(secret: string): Router {
  const router = Router();

  // Register all hook POST endpoints
  for (const route of HOOK_ROUTES) {
    router.post(route.path, (req: Request, res: Response) => {
      // Validate secret
      const received = req.headers['x-ccd-secret'];
      if (typeof received !== 'string' || !safeCompare(received, secret)) {
        logger.debug({ ip: req.ip, path: req.path }, 'Hook rejected: secret mismatch');
        res.status(403).send('forbidden');
        return;
      }

      // Validate body
      if (!hasValidBody(req.body)) {
        res.status(400).send('missing session_id');
        return;
      }

      logger.debug({ sessionId: req.body.session_id }, `Hook: ${route.event}`);
      setImmediate(() => bus.emit(route.event, req.body));
      res.status(200).send('ok');
    });
  }

  // Health check (unauthenticated)
  router.get('/hook/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', uptime: process.uptime() });
  });

  return router;
}
