import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requireAuth, type AuthenticatedRequest } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = requireAuth(req, res);
    if (!user) return; // Response already sent by requireAuth

    res.json({
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        roles: user.roles,
        permissions: user.permissions,
        resource: user.resource,
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ message: 'Failed to get user information' });
  }
}
