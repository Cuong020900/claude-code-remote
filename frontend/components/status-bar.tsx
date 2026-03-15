'use client';

interface StatusBarProps {
  connected: boolean;
  sessionCount: number;
  lastEventTime: number | null;
}

/** Sticky bottom status bar showing WS connection, session count, last event */
export function StatusBar({ connected, sessionCount, lastEventTime }: StatusBarProps) {
  const timeStr = lastEventTime
    ? new Date(lastEventTime).toLocaleTimeString()
    : '—';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-4 border-t border-border bg-card px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className={connected ? 'text-green-500' : 'text-red-500'}>
          {connected ? '●' : '●'}
        </span>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      <span>{sessionCount} active session{sessionCount !== 1 ? 's' : ''}</span>
      <span className="ml-auto">Last event: {timeStr}</span>
    </div>
  );
}
