import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = decoded.user;

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

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
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
