// Chat routes — send messages, create sessions, accept/reject/cancel actions

import { Router, type Request, type Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { sessionManager } from '../session-manager.js';
import { tmuxBridge } from '../tmux-bridge.js';
import { wsHub } from '../ws-hub.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/** Lookup session and its tmux target; sends 404/400 if invalid */
function resolveSession(req: Request, res: Response): { target: string; id: string } | null {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return null;
  }
  const session = sessionManager.getById(sessionId);
  if (!session) {
    res.status(404).json({ error: 'session not found' });
    return null;
  }
  if (!session.tmuxTarget) {
    res.status(400).json({ error: 'session has no tmux target' });
    return null;
  }
  return { target: session.tmuxTarget, id: session.id };
}

export function createChatRouter(): Router {
  const router = Router();

  /** Send a message to an active Claude Code session */
  router.post('/api/chat/send', (req: Request, res: Response) => {
    const { message } = req.body as { message?: string };
    const resolved = resolveSession(req, res);
    if (!resolved) return;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    try {
      tmuxBridge.sendKeys(resolved.target, message, ['Enter']);
      sessionManager.updateState(resolved.id, 'busy');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err, sessionId: resolved.id }, 'Failed to send message');
      res.status(500).json({ error: 'failed to send message' });
    }
  });

  /** Create a new Claude Code session in a tmux pane */
  router.post('/api/chat/new-session', (req: Request, res: Response) => {
    const { cwd } = req.body as { cwd?: string };
    if (!cwd || typeof cwd !== 'string') {
      res.status(400).json({ error: 'cwd is required' });
      return;
    }
    // Validate cwd is an existing directory (prevents passing arbitrary shell paths)
    try {
      if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
        res.status(400).json({ error: 'cwd must be an existing directory' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'invalid cwd path' });
      return;
    }
    try {
      const sessionName = config.tmuxSessionName;
      const target = tmuxBridge.createPane(sessionName, cwd);
      tmuxBridge.sendKeys(target, 'claude', ['Enter']);

      // Register session immediately so UI sees it without waiting for hook
      const sessionId = randomBytes(16).toString('hex');
      const session = sessionManager.register(sessionId, target, cwd);
      wsHub.broadcast({ type: 'session_started', session_id: sessionId, ...session, timestamp: Date.now() });

      res.json({ ok: true, sessionId, tmuxTarget: target });
    } catch (err) {
      logger.error({ err, cwd }, 'Failed to create new session');
      res.status(500).json({ error: 'failed to create session' });
    }
  });

  /** Accept a permission prompt (send 'y') */
  router.post('/api/chat/accept', (req: Request, res: Response) => {
    const resolved = resolveSession(req, res);
    if (!resolved) return;
    try {
      tmuxBridge.sendSpecialKey(resolved.target, 'y');
      sessionManager.updateState(resolved.id, 'busy');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err, sessionId: resolved.id }, 'Failed to accept');
      res.status(500).json({ error: 'failed to accept' });
    }
  });

  /** Reject a permission prompt (send 'n') */
  router.post('/api/chat/reject', (req: Request, res: Response) => {
    const resolved = resolveSession(req, res);
    if (!resolved) return;
    try {
      tmuxBridge.sendSpecialKey(resolved.target, 'n');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err, sessionId: resolved.id }, 'Failed to reject');
      res.status(500).json({ error: 'failed to reject' });
    }
  });

  /** Cancel current operation (send Ctrl-C) */
  router.post('/api/chat/cancel', (req: Request, res: Response) => {
    const resolved = resolveSession(req, res);
    if (!resolved) return;
    try {
      tmuxBridge.sendSpecialKey(resolved.target, 'C-c');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err, sessionId: resolved.id }, 'Failed to cancel');
      res.status(500).json({ error: 'failed to cancel' });
    }
  });

  return router;
}
