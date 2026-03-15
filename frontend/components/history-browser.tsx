'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import type { ProjectInfo, SessionMeta } from '@/lib/api';
import Link from 'next/link';

/** Browse conversation history by project */
export function HistoryBrowser() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SessionMeta[] | null>(null);

  // Load projects on mount
  useEffect(() => {
    api.getProjects().then(setProjects).catch(console.error);
  }, []);

  // Load sessions when project selected
  useEffect(() => {
    if (!selectedProject) { setSessions([]); return; }
    api.getProjectSessions(selectedProject).then(setSessions).catch(console.error);
  }, [selectedProject]);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(() => {
      api.searchHistory(searchQuery).then(setSearchResults).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displaySessions = searchResults ?? sessions;

  return (
    <div className="flex h-full">
      {/* Project list */}
      <div className="w-56 border-r border-border">
        <div className="p-3">
          <h3 className="text-sm font-semibold">Projects</h3>
        </div>
        <ScrollArea className="h-[calc(100%-48px)]">
          {projects.map((p) => (
            <button
              key={p.name}
              onClick={() => { setSelectedProject(p.name); setSearchResults(null); setSearchQuery(''); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                selectedProject === p.name ? 'bg-accent' : ''
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.sessionCount}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No projects found</p>
          )}
        </ScrollArea>
      </div>

      {/* Session list */}
      <div className="flex-1">
        <div className="border-b border-border p-3">
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <ScrollArea className="h-[calc(100%-56px)]">
          {displaySessions.map((s) => (
            <div key={s.id}>
              <Link
                href={`/history/${s.id}`}
                className="block px-4 py-3 text-sm hover:bg-accent"
              >
                <div className="font-medium">{s.summary || 'Untitled session'}</div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{s.messageCount} messages</span>
                  {s.gitBranch && <span>⎇ {s.gitBranch}</span>}
                  <span>{new Date(s.lastModifiedAt).toLocaleDateString()}</span>
                </div>
              </Link>
              <Separator />
            </div>
          ))}
          {displaySessions.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              {selectedProject ? 'No sessions found' : 'Select a project'}
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
