import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requireAuth, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const { id } = req.query;
  const resourceId = parseInt(id as string);

  if (isNaN(resourceId)) {
    return res.status(400).json({ message: 'Invalid resource ID' });
  }

  try {
    if (req.method === 'GET') {
      // Get specific resource - allow resource owners or managers
      const user = requireAuth(req, res);
      if (!user) return;

      // Check if user can access this resource (own resource or has permission)
      const hasPermission = user.permissions?.includes(PERMISSIONS.RESOURCE_MANAGEMENT) ||
                           user.resourceId === resourceId;

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const resource = await storage.getResourceWithAllocations(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      res.json(resource);

    } else if (req.method === 'PUT') {
      // Update resource
      const user = requirePermission(req, res, PERMISSIONS.RESOURCE_MANAGEMENT);
      if (!user) return;

      const updatedResource = await storage.updateResource(resourceId, req.body);
      res.json(updatedResource);

    } else if (req.method === 'DELETE') {
      // Delete resource
      const user = requirePermission(req, res, PERMISSIONS.RESOURCE_MANAGEMENT);
      if (!user) return;

      await storage.deleteResource(resourceId);
      res.json({ message: 'Resource deleted successfully' });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Resource API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
