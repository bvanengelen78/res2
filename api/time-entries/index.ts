import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Get all time entries
      const user = requirePermission(req, res, [PERMISSIONS.TIME_LOGGING, PERMISSIONS.SYSTEM_ADMIN]);
      if (!user) return;

      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);

    } else if (req.method === 'POST') {
      // Create new time entry
      const user = requirePermission(req, res, PERMISSIONS.TIME_LOGGING);
      if (!user) return;

      const timeEntry = await storage.createTimeEntry(req.body);
      res.status(201).json(timeEntry);

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Time entries API error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}
