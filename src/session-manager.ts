// Session manager — tracks active Claude Code sessions and maps to tmux targets

import { bus, type HookEvent } from './event-bus.js';
import { logger } from './logger.js';

export type SessionState = 'idle' | 'busy' | 'waiting';

/** Max idle time before session is cleaned up (30 minutes) */
const SESSION_TTL_MS = 30 * 60 * 1000;
/** Cleanup interval (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface Session {
  id: string;
  tmuxTarget: string;
  cwd: string;
  project: string;
  state: SessionState;
  createdAt: number;
  lastActivity: number;
}

class SessionManager {
  private sessions = new Map<string, Session>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.wireEvents();
    this.startCleanup();
  }

  private wireEvents(): void {
    bus.on('hook:session-start', (data) => this.handleSessionStart(data));
    bus.on('hook:stop', (data) => this.handleStop(data));
    bus.on('hook:permission', (data) => this.handlePermission(data));
    bus.on('hook:pretooluse', (data) => this.handlePreToolUse(data));
    bus.on('hook:notification', (data) => this.handleNotification(data));
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity > SESSION_TTL_MS) {
          this.sessions.delete(id);
          logger.info({ sessionId: id }, 'Session expired (idle timeout)');
        }
      }
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  private handleSessionStart(data: HookEvent): void {
    const { session_id, tmux_target, cwd } = data;
    if (!session_id) return;

    const tmuxTarget = (tmux_target as string) || '';
    const project = typeof cwd === 'string'
      ? cwd.split('/').pop() || 'unknown'
      : 'unknown';

    // If a pre-registered session has the same tmux target, replace it with the real session ID
    if (tmuxTarget) {
      for (const [fakeId, existing] of this.sessions) {
        if (existing.tmuxTarget === tmuxTarget && fakeId !== session_id) {
          this.sessions.delete(fakeId);
          logger.info({ fakeId, realId: session_id }, 'Replaced pre-registered session with real session ID');
          bus.emit('session:replaced' as never, { oldId: fakeId, newId: session_id });
          break;
        }
      }
    }

    this.sessions.set(session_id, {
      id: session_id,
      tmuxTarget,
      cwd: (cwd as string) || '',
      project,
      state: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    logger.info({ sessionId: session_id, project }, 'Session registered');
  }

  private handleStop(data: HookEvent): void {
    const session = this.ensureSession(data);
    if (!session) return;
    session.state = 'idle';
    session.lastActivity = Date.now();
  }

  private handlePermission(data: HookEvent): void {
    const session = this.ensureSession(data);
    if (!session) return;
    session.state = 'waiting';
    session.lastActivity = Date.now();
  }

  private handlePreToolUse(data: HookEvent): void {
    const session = this.ensureSession(data);
    if (!session) return;
    session.lastActivity = Date.now();
  }

  private handleNotification(data: HookEvent): void {
    const session = this.ensureSession(data);
    if (!session) return;
    session.lastActivity = Date.now();
  }

  private ensureSession(data: HookEvent): Session | null {
    const { session_id } = data;
    if (!session_id) return null;

    if (!this.sessions.has(session_id)) {
      this.sessions.set(session_id, {
        id: session_id,
        tmuxTarget: (data.tmux_target as string) || '',
        cwd: '',
        project: 'unknown',
        state: 'idle',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });
    }

    return this.sessions.get(session_id)!;
  }

  // --- Public API ---

  getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  getById(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  updateState(sessionId: string, state: SessionState): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = state;
      session.lastActivity = Date.now();
    }
  }

  remove(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  register(sessionId: string, tmuxTarget: string, cwd: string): Session {
    const project = cwd.split('/').pop() || 'unknown';
    const session: Session = {
      id: sessionId,
      tmuxTarget,
      cwd,
      project,
      state: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.sessions.set(sessionId, session);
    logger.info({ sessionId, project }, 'Session pre-registered');
    return session;
  }

  updateTmuxTarget(sessionId: string, target: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tmuxTarget = target;
    }
  }
}

export const sessionManager = new SessionManager();
