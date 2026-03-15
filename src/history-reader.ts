// History reader — parses Claude Code conversation history from ~/.claude/projects/

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { paths } from './config.js';
import { logger } from './logger.js';

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
  [key: string]: unknown;
}

/**
 * Validate that a user-supplied path segment contains no traversal sequences.
 * Prevents path traversal attacks like "../../etc/passwd".
 */
function isSafePathSegment(segment: string): boolean {
  if (!segment || typeof segment !== 'string') return false;
  // Reject path separators, null bytes, or dotdot sequences
  if (segment.includes('/') || segment.includes('\\') || segment.includes('\0')) return false;
  if (segment === '.' || segment === '..') return false;
  if (segment.includes('..')) return false;
  return true;
}

/** Verify resolved path is still within expected base directory */
function isWithinBase(base: string, target: string): boolean {
  const resolved = resolve(target);
  const normalBase = resolve(base) + sep;
  return resolved.startsWith(normalBase) || resolved === resolve(base);
}

/** Read and parse sessions-index.json for a project directory */
function readSessionIndex(projectDir: string): SessionMeta[] {
  const indexPath = join(projectDir, 'sessions-index.json');
  if (!existsSync(indexPath)) return [];

  try {
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as { sessions?: SessionMeta[] };
    return parsed.sessions ?? [];
  } catch (err) {
    logger.warn({ indexPath, err }, 'Failed to parse sessions-index.json');
    return [];
  }
}

/** Parse a JSONL transcript file into SessionEntry[] */
function parseJsonlFile(filePath: string): SessionEntry[] {
  if (!existsSync(filePath)) return [];

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entries: SessionEntry[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed) as SessionEntry);
      } catch {
        // skip malformed lines
      }
    }
    return entries;
  } catch (err) {
    logger.warn({ filePath, err }, 'Failed to read JSONL file');
    return [];
  }
}

class HistoryReader {
  /** List all projects found in ~/.claude/projects/ */
  listProjects(): ProjectInfo[] {
    const base = paths.claudeProjects;
    if (!existsSync(base)) return [];

    try {
      const dirs = readdirSync(base, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      return dirs.map((d) => {
        const fullPath = join(base, d.name);
        const sessions = readSessionIndex(fullPath);
        return { name: d.name, path: fullPath, sessionCount: sessions.length };
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to list projects');
      return [];
    }
  }

  /** List sessions for a specific project directory name */
  listSessions(projectDirName: string): SessionMeta[] {
    if (!isSafePathSegment(projectDirName)) return [];
    const projectDir = join(paths.claudeProjects, projectDirName);
    if (!isWithinBase(paths.claudeProjects, projectDir)) return [];
    return readSessionIndex(projectDir);
  }

  /** Get full transcript for a session within a project */
  getSession(projectDirName: string, sessionId: string): SessionEntry[] {
    if (!isSafePathSegment(projectDirName) || !isSafePathSegment(sessionId)) return [];
    const filePath = join(paths.claudeProjects, projectDirName, `${sessionId}.jsonl`);
    if (!isWithinBase(paths.claudeProjects, filePath)) return [];
    return parseJsonlFile(filePath);
  }

  /** Search sessions across all projects by query string (matches summary) */
  searchSessions(query: string, limit = 50): Array<SessionMeta & { project: string }> {
    const projects = this.listProjects();
    const results: Array<SessionMeta & { project: string }> = [];
    const lowerQuery = query.toLowerCase();

    for (const project of projects) {
      if (results.length >= limit) break;
      const sessions = this.listSessions(project.name);
      for (const session of sessions) {
        if (results.length >= limit) break;
        const summary = (session.summary || '').toLowerCase();
        if (summary.includes(lowerQuery)) {
          results.push({ ...session, project: project.name });
        }
      }
    }

    return results;
  }
}

export const historyReader = new HistoryReader();
