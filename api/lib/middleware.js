// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { SessionSecurityService } = require('./session-security');
const { ConfigSecurityService } = require('./config-security');
const { securityLogger, SecureErrorHandler, LOGGING_CONFIG } = require('./security-logging');
const { SecurityHeadersService, SECURITY_HEADERS_CONFIG } = require('./security-headers');

// Get secure configuration
const secureConfig = ConfigSecurityService.getSecureConfig();
const JWT_CONFIG = secureConfig.jwt;

// Initialize secure configuration on module load
try {
  ConfigSecurityService.initialize();
} catch (error) {
  console.error('[MIDDLEWARE] Secure configuration initialization failed:', error.message);
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}

// Standardized JWT Token Structure
const JWT_TOKEN_SCHEMA = z.object({
  userId: z.number().positive(),
  email: z.string().email(),
  resourceId: z.number().positive().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  iss: z.string().optional(),
  aud: z.string().optional()
});

// JWT Token Generation
function generateAccessToken(payload) {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    resourceId: payload.resourceId,
    roles: payload.roles || [],
    permissions: payload.permissions || [],
    sessionId: payload.sessionId
  };

  return jwt.sign(tokenPayload, JWT_CONFIG.accessSecret, {
    expiresIn: payload.rememberMe ? '30d' : JWT_CONFIG.accessExpiresIn,
    algorithm: JWT_CONFIG.algorithm,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
}

function generateRefreshToken(payload) {
  const tokenPayload = {
    userId: payload.userId,
    sessionId: payload.sessionId,
    type: 'refresh'
  };

  return jwt.sign(tokenPayload, JWT_CONFIG.refreshSecret, {
    expiresIn: payload.rememberMe ? '90d' : JWT_CONFIG.refreshExpiresIn,
    algorithm: JWT_CONFIG.algorithm,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
}

// JWT Token Verification
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessSecret, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    // Validate token structure
    const validation = JWT_TOKEN_SCHEMA.safeParse(decoded);
    if (!validation.success) {
      throw new Error('Invalid token structure');
    }

    return { success: true, payload: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    return { success: true, payload: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Initialize security headers service
SecurityHeadersService.initialize();

// Authorization Service
class AuthorizationService {

  /**
   * Check if user has required permission
   */
  static hasPermission(user, requiredPermission) {
    if (!user || !user.permissions) return false;

    // Admin users have all permissions
    if (user.permissions.includes('system_admin')) return true;

    // Check specific permission
    return user.permissions.includes(requiredPermission);
  }

  /**
   * Check if user has required role
   */
  static hasRole(user, requiredRole) {
    if (!user || !user.roles) return false;

    const userRoles = user.roles.map(r => typeof r === 'string' ? r : r.role);
    return userRoles.includes(requiredRole);
  }

  /**
   * Check if user has any of the required roles
   */
  static hasAnyRole(user, requiredRoles) {
    if (!user || !user.roles) return false;

    const userRoles = user.roles.map(r => typeof r === 'string' ? r : r.role);
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Check if user can access resource
   */
  static canAccessResource(user, resourceType, resourceId = null, action = 'read') {
    if (!user) return false;

    // System admin can access everything
    if (this.hasPermission(user, 'system_admin')) return true;

    // Resource-specific authorization
    switch (resourceType) {
      case 'user':
        // Users can access their own data
        if (resourceId && user.id === parseInt(resourceId)) return true;
        // User management permission required for other users
        return this.hasPermission(user, 'user_management');

      case 'project':
        // Project management permission required
        return this.hasPermission(user, 'project_management');

      case 'time_entry':
        // Users can access their own time entries
        if (action === 'read' || action === 'create') {
          return this.hasPermission(user, 'time_logging');
        }
        // Modification requires additional permissions
        return this.hasPermission(user, 'time_logging') &&
               (this.hasRole(user, 'admin') || this.hasRole(user, 'manager'));

      case 'report':
        return this.hasPermission(user, 'reports');

      case 'settings':
        return this.hasPermission(user, 'settings');

      default:
        return false;
    }
  }

  /**
   * Get authorization middleware
   */
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return createErrorResponse(res, 401, 'Authentication required');
      }

      if (!this.hasPermission(req.user, permission)) {
        securityLogger.logSecurityEvent(
          LOGGING_CONFIG.SECURITY_EVENTS.PRIVILEGE_ESCALATION,
          `Access denied - insufficient permissions`,
          {
            userId: req.user.id,
            requiredPermission: permission,
            userPermissions: req.user.permissions,
            endpoint: req.url,
            method: req.method,
            ip: req.ip
          },
          'WARN'
        );

        return createErrorResponse(res, 403, 'Insufficient permissions');
      }

      next();
    };
  }

  /**
   * Get role-based authorization middleware
   */
  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return createErrorResponse(res, 401, 'Authentication required');
      }

      if (!this.hasRole(req.user, role)) {
        securityLogger.logSecurityEvent(
          LOGGING_CONFIG.SECURITY_EVENTS.PRIVILEGE_ESCALATION,
          `Access denied - insufficient role`,
          {
            userId: req.user.id,
            requiredRole: role,
            userRoles: req.user.roles,
            endpoint: req.url,
            method: req.method,
            ip: req.ip
          },
          'WARN'
        );

        return createErrorResponse(res, 403, 'Insufficient role');
      }

      next();
    };
  }

  /**
   * Get resource-based authorization middleware
   */
  static requireResourceAccess(resourceType, action = 'read') {
    return (req, res, next) => {
      if (!req.user) {
        return createErrorResponse(res, 401, 'Authentication required');
      }

      const resourceId = req.params.id || req.params.userId || req.params.resourceId;

      if (!this.canAccessResource(req.user, resourceType, resourceId, action)) {
        securityLogger.logSecurityEvent(
          LOGGING_CONFIG.SECURITY_EVENTS.PRIVILEGE_ESCALATION,
          `Access denied - insufficient resource access`,
          {
            userId: req.user.id,
            resourceType,
            resourceId,
            action,
            endpoint: req.url,
            method: req.method,
            ip: req.ip
          },
          'WARN'
        );

        return createErrorResponse(res, 403, 'Access denied');
      }

      next();
    };
  }
}

// Enhanced logging utility
// Enhanced Logger using SecurityLogger
const Logger = {
  info: (message, context = {}) => {
    securityLogger.logSecurityEvent(
      LOGGING_CONFIG.SECURITY_EVENTS.DATA_ACCESS,
      message,
      context,
      'INFO'
    );
  },

  error: (message, error = null, context = {}) => {
    securityLogger.logSecurityEvent(
      LOGGING_CONFIG.SECURITY_EVENTS.SECURITY_VIOLATION,
      message,
      {
        ...context,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null
      },
      'ERROR'
    );
  },

  warn: (message, context = {}) => {
    securityLogger.logSecurityEvent(
      LOGGING_CONFIG.SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      message,
      context,
      'WARN'
    );
  },

  security: (eventType, message, context = {}) => {
    securityLogger.logSecurityEvent(
      eventType,
      message,
      context,
      'INFO'
    );
  }
};

// Authentication middleware with standardized JWT verification
const authenticate = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  try {
    const token = authHeader.substring(7);

    // Check if token is blacklisted
    if (SessionSecurityService.isTokenBlacklisted(token)) {
      Logger.warn('Blacklisted token attempted', { token: token.substring(0, 20) + '...' });
      return { success: false, error: 'Token has been revoked' };
    }

    // Use standardized token verification
    const verificationResult = verifyAccessToken(token);
    if (!verificationResult.success) {
      Logger.warn('Token verification failed', { error: verificationResult.error });
      return { success: false, error: 'Invalid or expired token' };
    }

    const decoded = verificationResult.payload;

    // Token is already validated by verifyAccessToken, extract standardized data
    const userId = decoded.userId;
    const email = decoded.email;
    const resourceId = decoded.resourceId;
    const roles = decoded.roles || [];
    const permissions = decoded.permissions || [];

    Logger.info('Token authenticated successfully', {
      userId,
      email,
      resourceId,
      rolesCount: roles.length,
      permissionsCount: permissions.length,
      sessionId: decoded.sessionId
    });

    // Get real user data from database for enhanced security
    let DatabaseService;
    try {
      DatabaseService = require('./supabase').DatabaseService;
    } catch (error) {
      Logger.error('Failed to load DatabaseService', error);
      // Continue without database validation for development
    }
    // Try to query real user data with roles and permissions for enhanced security
    try {
      if (!DatabaseService) {
        Logger.warn('DatabaseService not available, using token data');
        throw new Error('DatabaseService not available');
      }

      Logger.info('Querying database for user verification', { userId });

      const userWithRoles = await DatabaseService.getUserWithRoles(userId);

      if (userWithRoles) {
        Logger.info('User authenticated with database verification', {
          userId: userWithRoles.id,
          email: userWithRoles.email,
          roles: userWithRoles.roles?.map(r => r.role),
          permissions: userWithRoles.permissions
        });

        return { success: true, user: userWithRoles };
      } else {
        Logger.warn('User not found in database, using token data', { userId });
      }
    } catch (dbError) {
      Logger.warn('Database verification failed, using token data', {
        error: dbError.message,
        userId
      });
    }

    // Use token data as fallback (for development/testing)
    Logger.info('Using token data for authentication', { userId, email });

    const tokenUser = {
      id: userId,
      email: email,
      resourceId: resourceId,
      roles: roles.map(role => ({ role })),
      permissions: permissions,
      resource: resourceId ? { id: resourceId, name: 'Token User', role: 'User' } : null
    };

    return { success: true, user: tokenUser };
  } catch (error) {
    Logger.error('Authentication failed', error, { token: authHeader.substring(0, 20) + '...' });
    return { success: false, error: 'Invalid or expired token' };
  }
};

// Input validation middleware
const validateInput = (schema) => (data) => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    Logger.warn('Input validation failed', { error: error.errors });
    return { 
      success: false, 
      error: 'Invalid input data',
      details: error.errors 
    };
  }
};

// Secure error response utility
const createErrorResponse = (res, statusCode, message, details = null, context = {}) => {
  // Create a mock error object for the secure error handler
  const error = new Error(message);
  error.name = statusCode >= 400 && statusCode < 500 ? 'ClientError' : 'ServerError';

  const { response } = SecureErrorHandler.createErrorResponse(error, {
    ...context,
    statusCode,
    details
  });

  return res.status(statusCode).json(response);
};

// Success response utility
const createSuccessResponse = (res, data, statusCode = 200) => {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  return res.status(statusCode).json(response);
};

// Main middleware wrapper for serverless functions
const withMiddleware = (handler, options = {}) => {
  const {
    requireAuth = true,
    allowedMethods = ['GET'],
    validateSchema = null,
    rateLimit = false
  } = options;

  return async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      // Apply security headers and handle CORS
      SecurityHeadersService.applyHeaders(res, req);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        SecurityHeadersService.handlePreflight(req, res);
        return;
      }

      // Method validation
      if (!allowedMethods.includes(req.method)) {
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
      }

      // Authentication (now async)
      let user = null;
      if (requireAuth) {
        const authResult = await authenticate(req);
        if (!authResult.success) {
          return createErrorResponse(res, 401, authResult.error);
        }
        user = authResult.user;
      }

      // Input validation
      let validatedData = null;
      if (validateSchema) {
        const inputData = req.method === 'GET' ? req.query : req.body;
        const validationResult = validateInput(validateSchema)(inputData);
        if (!validationResult.success) {
          return createErrorResponse(res, 400, validationResult.error, validationResult.details);
        }
        validatedData = validationResult.data;
      }

      // Log request
      Logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        userId: user?.id
      });

      // Execute handler
      const result = await handler(req, res, { user, validatedData, requestId });
      
      // Log successful completion
      const duration = Date.now() - startTime;
      Logger.info('Request completed', {
        requestId,
        duration: `${duration}ms`,
        status: res.statusCode
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Request failed', error, {
        requestId,
        duration: `${duration}ms`,
        method: req.method,
        url: req.url
      });

      // Don't expose internal errors in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;

      return createErrorResponse(res, 500, message);
    }
  };
};

// Database retry utility
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      Logger.warn(`Database operation failed, retrying (${attempt}/${maxRetries})`, {
        error: error.message,
        attempt
      });
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

module.exports = {
  Logger,
  authenticate,
  validateInput,
  createErrorResponse,
  createSuccessResponse,
  withMiddleware,
  withRetry,
  // JWT utilities
  JWT_CONFIG,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  // Configuration utilities
  ConfigSecurityService,
  secureConfig,
  // Security logging utilities
  securityLogger,
  SecureErrorHandler,
  LOGGING_CONFIG,
  // Security headers utilities
  SecurityHeadersService,
  SECURITY_HEADERS_CONFIG,
  // Authorization utilities
  AuthorizationService
};
