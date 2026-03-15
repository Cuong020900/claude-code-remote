// HTTP client for CCD backend API at localhost:3500

const BASE = process.env.NEXT_PUBLIC_CCD_API_URL || 'http://localhost:3500';

// --- Types ---

export interface Session {
  id: string;
  tmuxTarget: string;
  cwd: string;
  project: string;
  state: 'idle' | 'busy' | 'waiting';
  createdAt: number;
  lastActivity: number;
}

export interface ProjectInfo {
  name: string;
  path: string;
  sessionCount: number;
}

export interface SessionMeta {
  id: string;
  summary: string;
  messageCount: number;
  gitBranch?: string;
  createdAt: string;
  lastModifiedAt: string;
}

export interface SessionEntry {
  role: string;
  content: unknown;
  sessionId: string;
  timestamp?: string;
}

export interface RegisteredProject {
  id: string;
  path: string;
  name: string;
}

// --- Helpers ---

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

// --- API ---

export const api = {
  // Sessions
  getSessions: () => get<Session[]>('/api/sessions'),
  getSession: (id: string) => get<Session | null>(`/api/sessions/${id}`),
  getSessionOutput: (id: string) =>
    get<{ output: string }>(`/api/sessions/${id}/output`).then((r) => r.output),
  deleteSession: (id: string) => del(`/api/sessions/${id}`),

  // Chat
  sendMessage: (sessionId: string, message: string) =>
    post('/api/chat/send', { sessionId, message }),
  newSession: (cwd: string) => post('/api/chat/new-session', { cwd }),
  acceptPermission: (sessionId: string) =>
    post('/api/chat/accept', { sessionId }),
  rejectPermission: (sessionId: string) =>
    post('/api/chat/reject', { sessionId }),
  cancelTask: (sessionId: string) =>
    post('/api/chat/cancel', { sessionId }),

  // History
  getProjects: () => get<ProjectInfo[]>('/api/history/projects'),
  getProjectSessions: (projectName: string) =>
    get<SessionMeta[]>(`/api/history/projects/${encodeURIComponent(projectName)}/sessions`),
  getHistorySession: (sessionId: string) =>
    get<{ meta: SessionMeta; project: string; entries: SessionEntry[] }>(
      `/api/history/sessions/${sessionId}`
    ),
  searchHistory: (query: string) =>
    get<SessionMeta[]>(`/api/history/search?q=${encodeURIComponent(query)}`),

  // Registered projects
  getRegisteredProjects: () => get<RegisteredProject[]>('/api/projects'),
  scanProjects: () =>
    post<{ ok: boolean; added: number; total: number; projects: RegisteredProject[] }>(
      '/api/projects/scan'
    ),
  registerProject: (path: string) => post<RegisteredProject>('/api/projects', { path }),
  removeProject: (id: string) => del(`/api/projects/${id}`),
};
