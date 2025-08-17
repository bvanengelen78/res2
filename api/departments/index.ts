import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Get all departments
      const user = requirePermission(req, res, [PERMISSIONS.RESOURCE_MANAGEMENT, PERMISSIONS.SYSTEM_ADMIN]);
      if (!user) return;

      const departments = await storage.getDepartments();
      res.json(departments);

    } else if (req.method === 'POST') {
      // Create new department
      const user = requirePermission(req, res, PERMISSIONS.SYSTEM_ADMIN);
      if (!user) return;

      const department = await storage.createDepartment(req.body);
      res.status(201).json(department);

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Departments API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
