'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Session, RegisteredProject } from '@/lib/api';
import { api } from '@/lib/api';

interface SessionSidebarProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
}

function stateDot(state: Session['state']) {
  switch (state) {
    case 'idle': return 'text-green-500';
    case 'busy': return 'text-blue-500';
    case 'waiting': return 'text-yellow-500';
    default: return 'text-gray-500';
  }
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function SessionSidebar({ sessions, selectedId, onSelect }: SessionSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cwd, setCwd] = useState('');
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadProjects = useCallback(() => {
    api.getRegisteredProjects()
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await api.scanProjects();
      setProjects(result.projects);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleNewSession() {
    if (!cwd.trim()) return;
    try {
      await api.newSession(cwd.trim());
      setCwd('');
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline">+ New</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Session</DialogTitle>
            </DialogHeader>

            {/* Quick-pick from scanned projects */}
            {projects.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs text-muted-foreground">Quick select project:</p>
                <ScrollArea className="max-h-40">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCwd(p.path)}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                        cwd === p.path ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-muted-foreground">{p.path.split('/').slice(-2).join('/')}</span>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Working directory path..."
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleScan}
                disabled={scanning}
                className="self-start"
                title="Scan ~/.claude/projects for known projects"
              >
                {scanning ? '...' : 'Scan'}
              </Button>
            </div>

            <Button onClick={handleNewSession} disabled={!cwd.trim()} className="mt-1">
              Create
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {sessions.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No active sessions</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
              selectedId === s.id ? 'bg-accent' : ''
            }`}
          >
            <span className={stateDot(s.state)}>●</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{s.project}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(s.lastActivity)}</div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
