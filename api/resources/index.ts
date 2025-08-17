import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Get all resources
      const user = requirePermission(req, res, [PERMISSIONS.RESOURCE_MANAGEMENT, PERMISSIONS.TIME_LOGGING]);
      if (!user) return;

      const resources = await storage.getResources();
      res.json(resources);

    } else if (req.method === 'POST') {
      // Create new resource
      const user = requirePermission(req, res, PERMISSIONS.RESOURCE_MANAGEMENT);
      if (!user) return;

      const resource = await storage.createResource(req.body);
      res.status(201).json(resource);

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Resources API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
