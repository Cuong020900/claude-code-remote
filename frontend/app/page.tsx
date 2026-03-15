'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionSidebar } from '@/components/session-sidebar';
import { ChatView } from '@/components/chat-view';
import { TerminalPane } from '@/components/terminal-pane';
import { StatusBar } from '@/components/status-bar';
import { useWebSocket } from '@/hooks/use-websocket';
import type { Session } from '@/lib/api';

/** Dashboard page — session sidebar + chat view + resizable terminal pane */
export default function DashboardPage() {
  const { connected, sessions, lastEvent, permissions, dismissPermission, replacedIds } = useWebSocket();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [terminalWidth, setTerminalWidth] = useState(45); // percentage
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-select first session when sessions arrive and nothing is selected
  useEffect(() => {
    if (selectedId === null && sessions.length > 0) {
      setSelectedId(sessions[0]!.id);
    }
  }, [sessions, selectedId]);

  // Follow ID replacement: if selected session was pre-registered and now has real ID, switch
  useEffect(() => {
    if (selectedId && replacedIds[selectedId]) {
      setSelectedId(replacedIds[selectedId]!);
    }
  }, [replacedIds, selectedId]);

  const currentSession = selectedId
    ? (sessions.find((s) => s.id === selectedId) ?? null)
    : null;

  // Drag handlers for resizable pane
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = ((rect.width - x) / rect.width) * 100;
      setTerminalWidth(Math.max(20, Math.min(80, pct)));
    };
    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <>
      <div className="flex h-full">
        <SessionSidebar
          sessions={sessions}
          selectedId={selectedId}
          onSelect={(s: Session) => setSelectedId(s.id)}
        />
        {currentSession ? (
          <div ref={containerRef} className="flex flex-1 overflow-hidden">
            {/* Chat */}
            <div className="flex-1 overflow-hidden">
              <ChatView
                sessionId={currentSession.id}
                sessionState={currentSession.state}
                permissions={permissions}
                onDismissPermission={dismissPermission}
                lastEvent={lastEvent}
                replacedIds={replacedIds}
              />
            </div>
            {/* Drag handle */}
            <div
              onMouseDown={onMouseDown}
              className="group relative z-10 w-1 cursor-col-resize bg-border transition-colors hover:bg-blue-500"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            {/* Terminal */}
            <div style={{ width: `${terminalWidth}%` }} className="min-w-[200px] overflow-hidden">
              <TerminalPane sessionId={currentSession.id} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Claude Code Dashboard</p>
              <p className="mt-1 text-sm">Select a session or create a new one</p>
            </div>
          </div>
        )}
      </div>
      <StatusBar
        connected={connected}
        sessionCount={sessions.length}
        lastEventTime={lastEvent?.timestamp ?? null}
      />
    </>
  );
}

