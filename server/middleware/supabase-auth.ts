import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side auth verification
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        roles: string[];
        permissions: string[];
        resourceId?: number;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Supabase Auth
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No valid authorization header found' 
      });
    }

    const token = authHeader.substring(7);

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication failed' 
      });
    }

    // Get user profile (without requiring roles to exist)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile error:', profileError);
      return res.status(401).json({
        error: 'User profile not found',
        message: 'User not properly configured in RBAC system'
      });
    }

    // Get user roles separately (this allows users without roles to still authenticate)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role:roles(name, display_name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError) {
      console.error('User roles error:', rolesError);
    }

    // Get user permissions (handle errors gracefully)
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions', { user_id: user.id });

    if (permError) {
      console.error('Error fetching user permissions:', permError);
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      roles: userRoles?.map((ur: any) => ur.role.name) || [],
      permissions: permissions?.map((p: any) => p.permission_name) || [],
      resourceId: userProfile.resource_id,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication' 
    });
  }
}

/**
 * Middleware to check if user has specific permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User not authenticated' 
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required permission: ${permission}` 
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User not authenticated' 
      });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        message: `Required role: ${role}` 
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the specified roles
 */
export function requireAnyRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User not authenticated' 
      });
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        message: `Required one of roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
}

/**
 * Middleware for admin-only routes
 */
export const adminOnly = requireRole('admin');

/**
 * Middleware for manager or admin routes
 */
export const managerOrAdmin = requireAnyRole(['manager', 'admin']);

/**
 * Middleware to check resource ownership
 */
export function authorizeResourceOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'User not authenticated' 
    });
  }

  // Admin can access any resource
  if (req.user.roles.includes('admin')) {
    return next();
  }

  // Check if user owns the resource
  const resourceId = parseInt(req.params.id || req.params.resourceId || '0');
  if (req.user.resourceId === resourceId) {
    return next();
  }

  return res.status(403).json({ 
    error: 'Access denied',
    message: 'You can only access your own resources' 
  });
}

/**
 * Legacy compatibility aliases
 */
export const authorize = requirePermission;
export const authorizeRole = requireRole;
