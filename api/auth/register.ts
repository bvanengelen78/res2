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
    const { email, password, resourceId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await authService.register({ email, password, resourceId });
    
    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        resourceId: result.user.resourceId,
        roles: result.user.roles,
        permissions: result.user.permissions,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : "Registration failed";
    res.status(400).json({ message });
  }
}
