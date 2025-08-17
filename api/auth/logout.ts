import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requireAuth, type AuthenticatedRequest } from '../_lib/auth';
import { authService } from '../_lib/auth-service';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = requireAuth(req, res);
    if (!user) return; // Response already sent by requireAuth

    await authService.logout(user.id);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}
