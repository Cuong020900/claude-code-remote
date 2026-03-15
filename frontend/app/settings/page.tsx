'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWebSocket } from '@/hooks/use-websocket';

interface HealthStatus {
  status: string;
  version?: string;
  uptime?: number;
}

/** Settings page — CCD configuration and status overview */
export default function SettingsPage() {
  const { connected } = useWebSocket();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CCD_API_URL || 'http://localhost:3500';
    fetch(`${base}/hook/health`)
      .then((r) => r.json())
      .then((data) => setHealth(data as HealthStatus))
      .catch(() => setHealthError(true));
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        CCD backend configuration and connection status
      </p>

      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Backend URL</span>
          <code className="rounded bg-muted px-2 py-1 text-sm">
            {process.env.NEXT_PUBLIC_CCD_API_URL || 'http://localhost:3500'}
          </code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">WebSocket</span>
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Hook Health</span>
          {healthError ? (
            <Badge variant="destructive">Unreachable</Badge>
          ) : health ? (
            <Badge variant="default">{health.status}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Checking...</span>
          )}
        </div>

        {health?.uptime !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Uptime</span>
            <span className="text-sm text-muted-foreground">
              {Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s
            </span>
          </div>
        )}

        {health?.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <span className="text-sm text-muted-foreground">{health.version}</span>
          </div>
        )}
      </div>
    </div>
  );
}
