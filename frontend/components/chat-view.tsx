'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/message-bubble';
import { PermissionDialog } from '@/components/permission-dialog';
import { api } from '@/lib/api';
import type { SessionEntry, Session } from '@/lib/api';
import type { PermissionRequest, WsEvent } from '@/hooks/use-websocket';

interface ChatViewProps {
  sessionId: string;
  sessionState?: Session['state'];
  permissions?: PermissionRequest[];
  onDismissPermission?: (sessionId: string) => void;
  lastEvent?: WsEvent | null;
  replacedIds?: Record<string, string>;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: unknown;
  timestamp?: string;
}

/** Convert session entries to display messages */
function entriesToMessages(entries: SessionEntry[]): DisplayMessage[] {
  return entries
    .filter((e) => e.role === 'user' || e.role === 'assistant')
    .map((e) => ({
      role: e.role as 'user' | 'assistant',
      content: e.content,
      timestamp: e.timestamp,
    }));
}



export function ChatView({
  sessionId,
  sessionState,
  permissions = [],
  onDismissPermission,
  lastEvent,
  replacedIds = {},
}: ChatViewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Resolve fake session ID → real Claude session ID for history lookups */
  const resolvedId = replacedIds[sessionId] || sessionId;

  const fetchMessages = useCallback(() => {
    // Try with resolved ID first, fall back to original
    api.getHistorySession(resolvedId)
      .then((data) => setMessages(entriesToMessages(data.entries)))
      .catch(() => {
        if (resolvedId !== sessionId) {
          api.getHistorySession(sessionId)
            .then((data) => setMessages(entriesToMessages(data.entries)))
            .catch(() => { /* New session with no history yet */ });
        }
      });
  }, [sessionId, resolvedId]);


  // Fetch history on mount / session change
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Re-fetch when agent stops (new assistant messages available)
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== 'agent_stopped') return;

    const eventSessionId = lastEvent.session_id as string;
    // Match against both original and resolved IDs
    if (eventSessionId === sessionId || eventSessionId === resolvedId) {
      fetchMessages();
    }
  }, [lastEvent, sessionId, resolvedId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.sendMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setInput('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find permission request for this session
  const pendingPerm = permissions.find((p) => p.sessionId === sessionId);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Send a message to start.
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={`${sessionId}-${i}`}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
      </ScrollArea>

      {/* State indicator */}
      {sessionState === 'busy' && (
        <div className="border-t border-border px-4 py-2 text-xs text-blue-400">
          Claude is working...
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => api.cancelTask(sessionId).catch(console.error)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[40px] resize-none"
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()}>
            Send
          </Button>
        </div>
      </div>

      {/* Permission dialog */}
      {pendingPerm && (
        <PermissionDialog
          open
          sessionId={pendingPerm.sessionId}
          toolName={pendingPerm.toolName}
          input={pendingPerm.input}
          onApprove={async () => {
            try {
              await api.acceptPermission(sessionId);
              onDismissPermission?.(sessionId);
            } catch (err) {
              console.error('Failed to accept permission:', err);
            }
          }}
          onReject={async () => {
            try {
              await api.rejectPermission(sessionId);
              onDismissPermission?.(sessionId);
            } catch (err) {
              console.error('Failed to reject permission:', err);
            }
          }}
        />
      )}
    </div>
  );
}
