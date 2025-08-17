import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requirePermission, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';
import { PERMISSIONS } from '@shared/schema';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = requirePermission(req, res, [PERMISSIONS.TIME_LOGGING, PERMISSIONS.SYSTEM_ADMIN]);
    if (!user) return;

    const pendingSubmissions = await storage.getPendingWeeklySubmissions();
    res.json(pendingSubmissions);
  } catch (error) {
    console.error('Pending submissions API error:', error);
    res.status(500).json({ message: 'Failed to fetch pending submissions' });
  }
}
