import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, handleError } from '../_lib/auth';
import { authService } from '../_lib/auth-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    const message = error instanceof Error ? error.message : "Token refresh failed";
    res.status(401).json({ message });
  }
}
