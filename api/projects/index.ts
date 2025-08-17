import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Get all projects
      const user = requirePermission(req, res, [PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]);
      if (!user) return;

      const projects = await storage.getProjects();
      res.json(projects);

    } else if (req.method === 'POST') {
      // Create new project
      const user = requirePermission(req, res, PERMISSIONS.PROJECT_MANAGEMENT);
      if (!user) return;

      const project = await storage.createProject(req.body);
      res.status(201).json(project);

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
