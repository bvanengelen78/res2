// Shared authentication utilities for serverless functions
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { UserWithRoles } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends VercelRequest {
  user?: UserWithRoles;
}

export function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function verifyToken(token: string): UserWithRoles | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.user;
  } catch (error) {
    return null;
  }
}

export function authenticate(req: AuthenticatedRequest): UserWithRoles | null {
  const token = extractToken(req);
  if (!token) {
    return null;
  }
  
  const user = verifyToken(token);
  if (user) {
    req.user = user;
  }
  
  return user;
}

export function requireAuth(req: AuthenticatedRequest, res: VercelResponse): UserWithRoles | null {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return user;
}

export function requirePermission(
  req: AuthenticatedRequest, 
  res: VercelResponse, 
  permission: string | string[]
): UserWithRoles | null {
  const user = requireAuth(req, res);
  if (!user) return null;

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasPermission = permissions.some(p => user.permissions?.includes(p as any));
  
  if (!hasPermission) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return null;
  }
  
  return user;
}

export function requireRole(
  req: AuthenticatedRequest, 
  res: VercelResponse, 
  role: string | string[]
): UserWithRoles | null {
  const user = requireAuth(req, res);
  if (!user) return null;

  const roles = Array.isArray(role) ? role : [role];
  const hasRole = roles.some(r => user.roles?.some(userRole => userRole.role === r));
  
  if (!hasRole) {
    res.status(403).json({ message: 'Insufficient role permissions' });
    return null;
  }
  
  return user;
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

export function handleError(res: VercelResponse, error: any, defaultMessage: string = 'Internal server error') {
  console.error('API Error:', error);
  
  if (error.message) {
    res.status(500).json({ message: error.message });
  } else {
    res.status(500).json({ message: defaultMessage });
  }
}
