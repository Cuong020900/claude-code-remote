'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface ToolCallCardProps {
  toolName: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'done' | 'error';
}

function statusColor(status: ToolCallCardProps['status']) {
  switch (status) {
    case 'pending': return 'secondary';
    case 'done': return 'default';
    case 'error': return 'destructive';
  }
}

/** Collapsible card showing tool call details */
export function ToolCallCard({ toolName, input, output, status }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs">{toolName}</span>
          <Badge variant={statusColor(status)}>{status}</Badge>
        </span>
        <span className="text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 text-xs">
          <div className="mb-2">
            <span className="font-semibold text-muted-foreground">Input:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
              {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {output !== undefined && (
            <div>
              <span className="font-semibold text-muted-foreground">Output:</span>
              <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
