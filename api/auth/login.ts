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
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await authService.login({ email, password, rememberMe });
    
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        resourceId: result.user.resourceId,
        roles: result.user.roles,
        permissions: result.user.permissions,
        resource: result.user.resource,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(401).json({ message });
  }
}
