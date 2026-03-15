'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

/** Polling interval: 2 seconds */
const POLL_INTERVAL_MS = 2000;

interface TerminalPaneProps {
  sessionId: string;
}

export function TerminalPane({ sessionId }: TerminalPaneProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLPreElement>(null);

  const fetchOutput = useCallback(() => {
    api.getSessionOutput(sessionId)
      .then((text) => {
        if (text && text.trim()) {
          setOutput(text);
          setError(null);
        }
      })
      .catch(() => {
        setError('No tmux pane available');
      });
  }, [sessionId]);

  // Poll terminal output continuously
  useEffect(() => {
    fetchOutput(); // fetch immediately on mount
    const timer = setInterval(fetchOutput, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchOutput]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
      </div>

      {/* Output area */}
      <pre
        ref={scrollRef}
        className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5 text-green-400/90"
      >
        {error ? (
          <span className="text-muted-foreground italic">{error}</span>
        ) : output ? (
          output
        ) : (
          <span className="text-muted-foreground italic">Waiting for output...</span>
        )}
      </pre>
    </div>
  );
}
