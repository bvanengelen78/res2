import { Request, Response, NextFunction } from 'express';
import { authService } from '../auth';
import type { UserWithRoles, PermissionType, RoleType } from '@shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserWithRoles;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[AUTH] Authenticating request: ${req.method} ${req.path}`);
    const authHeader = req.headers.authorization;
    console.log(`[AUTH] Authorization header present: ${!!authHeader}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[AUTH] No valid authorization header found`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log(`[AUTH] Token extracted, length: ${token.length}`);

    const user = await authService.verifyToken(token);
    req.user = user;
    console.log(`[AUTH] User authenticated: ${user.email} (ID: ${user.id})`);

    next();
  } catch (error) {
    console.error(`[AUTH] Authentication failed:`, error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
};

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const user = await authService.verifyToken(token);
        req.user = user;
      } catch (error) {
        // Token is invalid, but we continue without user
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required permissions
 */
export const authorize = (requiredPermissions: PermissionType | PermissionType[], options?: { requireAll?: boolean }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const requireAll = options?.requireAll ?? false;

    const hasPermission = requireAll 
      ? permissions.every(permission => authService.hasPermission(req.user!.permissions, permission))
      : authService.hasAnyPermission(req.user.permissions, permissions);

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

/**
 * Role-based authorization middleware factory
 * Checks if user has required roles
 */
export const authorizeRole = (requiredRoles: RoleType | RoleType[], options?: { requireAll?: boolean }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const requireAll = options?.requireAll ?? false;
    const userRoles = req.user.roles.map(r => r.role as RoleType);

    const hasRole = requireAll 
      ? authService.hasAnyRole(userRoles, roles)
      : authService.hasAnyRole(userRoles, roles);

    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient role permissions' 
      });
    }

    next();
  };
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or has admin permissions
 */
export const authorizeResourceOwner = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    const requestedResourceId = parseInt(req.params[resourceIdParam]);
    const userResourceId = req.user.resourceId;

    // Admin can access any resource
    if (authService.hasPermission(req.user.permissions, 'system_admin')) {
      return next();
    }

    // User can access their own resource
    if (userResourceId === requestedResourceId) {
      return next();
    }

    // Manager Change can access resources they manage
    if (authService.hasPermission(req.user.permissions, 'resource_management')) {
      return next();
    }

    res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Cannot access this resource' 
    });
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize('system_admin');

/**
 * Manager or Admin middleware
 */
export const managerOrAdmin = authorize(['resource_management', 'system_admin']);

/**
 * Error handler for authentication errors
 */
export const authErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid token' 
    });
  } else {
    next(err);
  }
};