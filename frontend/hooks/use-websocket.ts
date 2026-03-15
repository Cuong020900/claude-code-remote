'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Session } from '@/lib/api';

// --- Types ---

export interface WsEvent {
  type: string;
  session_id?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface PermissionRequest {
  sessionId: string;
  toolName: string;
  input: unknown;
  timestamp: number;
}

// --- Hook ---

const WS_URL = process.env.NEXT_PUBLIC_CCD_WS_URL || 'ws://localhost:3500';
const MAX_BACKOFF = 30_000;

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [replacedIds, setReplacedIds] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReconnect = useCallback((fn: () => void) => {
    const delay = Math.min(backoffRef.current, MAX_BACKOFF);
    backoffRef.current = delay * 2;
    reconnectTimerRef.current = setTimeout(fn, delay);
  }, []);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        backoffRef.current = 1000;
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect(connect);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WsEvent;
          setLastEvent(data);
          handleEvent(data);
        } catch {
          // ignore malformed messages
        }
      };
    } catch {
      // WebSocket constructor can throw if URL is invalid
      scheduleReconnect(connect);
    }
  }, [scheduleReconnect]);

  const handleEvent = useCallback((evt: WsEvent) => {
    switch (evt.type) {
      case 'sessions_init':
        setSessions((evt.sessions as Session[]) || []);
        break;

      case 'session_started':
      case 'agent_stopped':
      case 'session_updated':
        setSessions((prev) => {
          const { type: _t, timestamp: _ts, session_id, ...rest } = evt;
          // id can come as 'id' (direct broadcast) or 'session_id' (hook event)
          const id = (rest as { id?: string }).id || (session_id as string);
          if (!id) return prev;

          const sessionPatch = { ...rest, id } as Session;
          const idx = prev.findIndex((s) => s.id === id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...sessionPatch };
            return updated;
          }
          return [...prev, sessionPatch];
        });
        break;

      case 'session_replaced': {
        // Backend swapped a pre-registered fake ID for Claude's real session ID
        const { oldId, newId } = evt as unknown as { oldId: string; newId: string };
        setSessions((prev) =>
          prev.map((s) => (s.id === oldId ? { ...s, id: newId } : s))
        );
        setReplacedIds((prev) => ({ ...prev, [oldId]: newId }));
        break;
      }

      case 'permission_request':
        setPermissions((prev) => [
          ...prev,
          {
            sessionId: (evt.session_id as string) || '',
            toolName: (evt.tool_name as string) || 'unknown',
            input: evt.input ?? null,
            timestamp: evt.timestamp || Date.now(),
          },
        ]);
        break;
    }
  }, []);

  const dismissPermission = useCallback((sessionId: string) => {
    setPermissions((prev) =>
      prev.filter((p) => p.sessionId !== sessionId)
    );
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, sessions, lastEvent, permissions, dismissPermission, replacedIds };
}
