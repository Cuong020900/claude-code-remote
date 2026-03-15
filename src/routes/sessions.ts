// Sessions routes — list, get, capture output, delete active sessions

import { Router, type Request, type Response } from 'express';
import { sessionManager } from '../session-manager.js';
import { tmuxBridge } from '../tmux-bridge.js';
import { logger } from '../logger.js';

export function createSessionsRouter(): Router {
  const router = Router();

  /** List all active sessions */
  router.get('/api/sessions', (_req: Request, res: Response) => {
    res.json(sessionManager.getAll());
  });

  /** Get a single session by ID */
  router.get('/api/sessions/:id', (req: Request, res: Response) => {
    const session = sessionManager.getById(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    res.json(session);
  });

  /** Capture recent output from a session's tmux pane */
  router.get('/api/sessions/:id/output', (req: Request, res: Response) => {
    const session = sessionManager.getById(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    if (!session.tmuxTarget) {
      res.status(400).json({ error: 'session has no tmux target' });
      return;
    }
    try {
      const output = tmuxBridge.capturePane(session.tmuxTarget, 100);
      res.json({ output });
    } catch (err) {
      logger.error({ err, sessionId: session.id }, 'Failed to capture pane');
      res.status(500).json({ error: 'failed to capture output' });
    }
  });

  /** Delete (kill) a session */
  router.delete('/api/sessions/:id', (req: Request, res: Response) => {
    const session = sessionManager.getById(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    if (session.tmuxTarget) {
      try {
        tmuxBridge.killPane(session.tmuxTarget);
      } catch (err) {
        logger.warn({ err, sessionId: session.id }, 'Failed to kill pane during delete');
      }
    }
    sessionManager.remove(session.id);
    res.json({ ok: true });
  });

  return router;
}
