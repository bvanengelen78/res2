import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Get all allocations
      const user = requirePermission(req, res, [PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]);
      if (!user) return;

      const allocations = await storage.getResourceAllocations();
      res.json(allocations);

    } else if (req.method === 'POST') {
      // Create new allocation
      const user = requirePermission(req, res, PERMISSIONS.PROJECT_MANAGEMENT);
      if (!user) return;

      const allocation = await storage.createResourceAllocation(req.body);
      res.status(201).json(allocation);

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Allocations API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
