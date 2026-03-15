// WebSocket hub — manages connections and broadcasts events to frontend

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { bus, type HookEvent, type HookEventType } from './event-bus.js';
import { sessionManager } from './session-manager.js';
import { logger } from './logger.js';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

class WsHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  /** Attach WebSocket server to existing HTTP server */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.info(`WebSocket client connected (total: ${this.clients.size})`);

      // Send current sessions list on connect
      this.sendTo(ws, {
        type: 'sessions_init',
        sessions: sessionManager.getAll(),
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WsMessage;
          this.handleClientMessage(ws, msg);
        } catch {
          // ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.debug(`WebSocket client disconnected (total: ${this.clients.size})`);
      });
    });

    this.wireEventBus();
    logger.info('WebSocket hub attached');
  }

  /** Wire event bus events to WebSocket broadcasts */
  private wireEventBus(): void {
    const hookMap: Record<string, string> = {
      'hook:stop': 'agent_stopped',
      'hook:notification': 'notification',
      'hook:session-start': 'session_started',
      'hook:pretooluse': 'pretooluse',
      'hook:permission': 'permission_request',
    };

    for (const [hookEvent, wsType] of Object.entries(hookMap)) {
      bus.on(hookEvent as never, (data: HookEvent) => {
        this.broadcast({
          type: wsType,
          ...data,
          timestamp: Date.now(),
        });
      });
    }

    // Notify frontend when a pre-registered session ID is replaced by the real Claude session ID
    bus.on('session:replaced' as never, (data: { oldId: string; newId: string }) => {
      this.broadcast({ type: 'session_replaced', oldId: data.oldId, newId: data.newId, timestamp: Date.now() });
    });
  }

  private handleClientMessage(_ws: WebSocket, msg: WsMessage): void {
    logger.debug({ type: msg.type }, 'WebSocket message received');
    // Future: handle set_session, subscribe_all, etc.
  }

  /** Send to a single client */
  private sendTo(ws: WebSocket, data: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /** Broadcast to all connected clients */
  broadcast(data: WsMessage): void {
    const msg = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  /** Close all connections and shut down the WebSocket server */
  close(): void {
    for (const client of this.clients) {
      client.close(1001, 'server shutting down');
    }
    this.clients.clear();
    this.wss?.close();
  }
}

export const wsHub = new WsHub();
