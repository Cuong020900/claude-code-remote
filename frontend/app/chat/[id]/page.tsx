'use client';

import { use } from 'react';
import { ChatView } from '@/components/chat-view';
import { StatusBar } from '@/components/status-bar';
import { useWebSocket } from '@/hooks/use-websocket';

/** Full-page chat view for a specific session */
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { connected, sessions, lastEvent, permissions, dismissPermission } = useWebSocket();
  const session = sessions.find((s) => s.id === id);

  return (
    <>
      <div className="h-full">
        <ChatView
          sessionId={id}
          sessionState={session?.state}
          permissions={permissions}
          onDismissPermission={dismissPermission}
        />
      </div>
      <StatusBar
        connected={connected}
        sessionCount={sessions.length}
        lastEventTime={lastEvent?.timestamp ?? null}
      />
    </>
  );
}
