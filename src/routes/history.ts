// History routes — browse Claude Code conversation history

import { Router, type Request, type Response } from 'express';
import { historyReader } from '../history-reader.js';

export function createHistoryRouter(): Router {
  const router = Router();

  /** List all projects with conversation history */
  router.get('/api/history/projects', (_req: Request, res: Response) => {
    res.json(historyReader.listProjects());
  });

  /** List sessions for a specific project */
  router.get('/api/history/projects/:projectName/sessions', (req: Request, res: Response) => {
    const sessions = historyReader.listSessions(req.params.projectName as string);
    res.json(sessions);
  });

  /** Get full transcript for a session (scans all projects to find it) */
  router.get('/api/history/sessions/:sessionId', (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const projects = historyReader.listProjects();

    for (const project of projects) {
      const sessions = historyReader.listSessions(project.name);
      const match = sessions.find((s) => s.id === sessionId);
      if (match) {
        const entries = historyReader.getSession(project.name, sessionId);
        res.json({ meta: match, project: project.name, entries });
        return;
      }
    }

    res.status(404).json({ error: 'session not found' });
  });

  /** Search sessions by query string */
  router.get('/api/history/search', (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    if (!query) {
      res.status(400).json({ error: 'query parameter q is required' });
      return;
    }
    res.json(historyReader.searchSessions(query));
  });

  return router;
}
