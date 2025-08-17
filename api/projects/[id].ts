import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const { id } = req.query;
  const projectId = parseInt(id as string);

  if (isNaN(projectId)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    if (req.method === 'GET') {
      // Get specific project
      const user = requirePermission(req, res, [PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]);
      if (!user) return;

      const project = await storage.getProjectWithAllocations(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      res.json(project);

    } else if (req.method === 'PUT') {
      // Update project
      const user = requirePermission(req, res, PERMISSIONS.PROJECT_MANAGEMENT);
      if (!user) return;

      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);

    } else if (req.method === 'DELETE') {
      // Delete project
      const user = requirePermission(req, res, PERMISSIONS.PROJECT_MANAGEMENT);
      if (!user) return;

      await storage.deleteProject(projectId);
      res.json({ message: 'Project deleted successfully' });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
