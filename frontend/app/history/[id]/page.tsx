'use client';

import { use, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/message-bubble';
import { api } from '@/lib/api';
import type { SessionEntry, SessionMeta } from '@/lib/api';
import Link from 'next/link';

/** Read-only transcript view for a historical session */
export default function HistorySessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHistorySession(id)
      .then((data) => {
        setEntries(data.entries);
        setMeta(data.meta);
      })
      .catch(() => setError('Session not found'));
  }, [id]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{error}</p>
          <Link href="/history" className="mt-2 text-sm text-primary underline">
            Back to history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-sm text-primary hover:underline">
            ← History
          </Link>
          {meta && (
            <div>
              <h2 className="text-sm font-semibold">{meta.summary || 'Session transcript'}</h2>
              <p className="text-xs text-muted-foreground">
                {meta.messageCount} messages · {new Date(meta.lastModifiedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      <ScrollArea className="flex-1 p-4">
        {entries
          .filter((e) => e.role === 'user' || e.role === 'assistant')
          .map((entry, i) => (
            <MessageBubble
              key={`${id}-${i}`}
              role={entry.role as 'user' | 'assistant'}
              content={entry.content}
              timestamp={entry.timestamp}
            />
          ))}
      </ScrollArea>
    </div>
  );
}
