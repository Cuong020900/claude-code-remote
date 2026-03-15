// Projects routes — manage registered project directories + auto-scan from Claude history
import { Router, type Request, type Response } from 'express';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface RegisteredProject {
  id: string;
  path: string;
  name: string;
}

/** In-memory store of registered projects */
const projects: RegisteredProject[] = [];

/** Decode Claude's project directory name encoding: replaces leading '-' and '-' separators with '/' */
function decodeClaudioProjectDir(dirName: string): string {
  // Claude encodes absolute paths by replacing '/' with '-'
  // e.g. "-Users-foo-myproject" → "/Users/foo/myproject"
  return dirName.replace(/-/g, '/');
}

/** Scan ~/.claude/projects/ and return discovered project paths that exist on disk */
function scanClaudeProjects(): RegisteredProject[] {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects');
  if (!existsSync(claudeProjectsDir)) return [];

  try {
    return readdirSync(claudeProjectsDir)
      .filter((entry) => {
        try {
          return statSync(join(claudeProjectsDir, entry)).isDirectory();
        } catch { return false; }
      })
      .map((dirName) => {
        const fsPath = decodeClaudioProjectDir(dirName);
        const name = fsPath.split('/').filter(Boolean).pop() || dirName;
        return { id: randomBytes(8).toString('hex'), path: fsPath, name };
      })
      .filter((p) => existsSync(p.path));
  } catch {
    return [];
  }
}

export function createProjectsRouter(): Router {
  const router = Router();

  /** List all registered projects */
  router.get('/api/projects', (_req: Request, res: Response) => {
    res.json(projects);
  });

  /**
   * Auto-scan ~/.claude/projects/ and register any discovered projects not already registered.
   * Returns the full list of registered projects after scan.
   */
  router.post('/api/projects/scan', (_req: Request, res: Response) => {
    const discovered = scanClaudeProjects();
    let added = 0;

    for (const p of discovered) {
      if (!projects.find((existing) => existing.path === p.path)) {
        projects.push(p);
        added++;
      }
    }

    res.json({ ok: true, added, total: projects.length, projects });
  });

  /** Register a new project directory */
  router.post('/api/projects', (req: Request, res: Response) => {
    const { path: projectPath } = req.body as { path?: string };
    if (!projectPath) {
      res.status(400).json({ error: 'path is required' });
      return;
    }
    if (!existsSync(projectPath)) {
      res.status(400).json({ error: 'path does not exist' });
      return;
    }

    const existing = projects.find((p) => p.path === projectPath);
    if (existing) {
      res.json(existing);
      return;
    }

    const name = projectPath.split('/').pop() || projectPath;
    const project: RegisteredProject = {
      id: randomBytes(8).toString('hex'),
      path: projectPath,
      name,
    };
    projects.push(project);
    res.status(201).json(project);
  });

  /** Remove a registered project by ID */
  router.delete('/api/projects/:id', (req: Request, res: Response) => {
    const idx = projects.findIndex((p) => p.id === (req.params.id as string));
    if (idx === -1) {
      res.status(404).json({ error: 'project not found' });
      return;
    }
    const [removed] = projects.splice(idx, 1);
    res.json({ ok: true, removed });
  });

  return router;
}
