/**
 * Mock Middleware for MVP Testing
 * 
 * This middleware bypasses all authentication and permission checks
 * to enable stakeholder testing without authentication barriers.
 * 
 * Usage: Replace the import in API endpoints from './middleware.js' to './middleware.testing.js'
 */

const Logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message, data) => console.error(`[ERROR] ${message}`, data || ''),
};

// Mock user data for testing
const mockUser = {
  id: 'mock-user-id',
  email: 'stakeholder@test.com',
  roles: ['admin', 'manager', 'user'],
  permissions: [
    'dashboard',
    'project_management', 
    'resource_management',
    'time_logging',
    'submission_overview',
    'reports',
    'change_lead_reports',
    'user_management',
    'system_admin',
    'settings',
    'role_management',
    'calendar'
  ],
  resourceId: 1,
  name: 'Test Stakeholder'
};

// Mock authentication function - always succeeds
const authenticate = async (req) => {
  Logger.info('Mock authentication - always succeeds', {
    method: req.method,
    url: req.url
  });

  return { 
    success: true, 
    user: mockUser 
  };
};

// Create standardized error response
const createErrorResponse = (res, statusCode, message, details = null) => {
  const errorResponse = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorResponse.details = details;
  }

  Logger.error(`API Error ${statusCode}`, errorResponse);
  return res.status(statusCode).json(errorResponse);
};

// Create standardized success response
const createSuccessResponse = (res, data, message = 'Success') => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(response);
};

// Main middleware wrapper for serverless functions - TESTING VERSION
const withMiddleware = (handler, options = {}) => {
  const {
    requireAuth = false, // Changed default to false for testing
    allowedMethods = ['GET'],
    validateSchema = null,
    rateLimit = false,
    requiredPermissions = []
  } = options;

  return async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      // Apply security headers and handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Method validation
      if (!allowedMethods.includes(req.method)) {
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
      }

      // Mock authentication - always provide mock user
      let user = mockUser;
      if (requireAuth) {
        Logger.info('Mock authentication enabled - providing mock user', {
          requestId,
          userId: user.id,
          email: user.email
        });
      }

      // Mock permission checking - always pass
      if (requiredPermissions.length > 0) {
        Logger.info('Mock permission check - always passes', {
          requestId,
          userId: user.id,
          requiredPermissions,
          userPermissions: user.permissions
        });
      }

      // Input validation (keep this for data integrity)
      let validatedData = null;
      if (validateSchema) {
        const inputData = req.method === 'GET' ? req.query : req.body;
        
        try {
          validatedData = validateSchema.parse(inputData);
          Logger.info('Input validation passed', {
            requestId,
            method: req.method
          });
        } catch (validationError) {
          Logger.warn('Input validation failed', {
            requestId,
            error: validationError.message,
            issues: validationError.issues
          });
          return createErrorResponse(res, 400, 'Invalid input data', validationError.issues);
        }
      }

      // Rate limiting (disabled for testing)
      if (rateLimit) {
        Logger.info('Rate limiting disabled for testing', { requestId });
      }

      // Add user and validated data to request
      req.user = user;
      req.validatedData = validatedData;
      req.requestId = requestId;

      Logger.info('Request processing started', {
        requestId,
        method: req.method,
        url: req.url,
        userId: user.id,
        hasValidatedData: !!validatedData
      });

      // Call the actual handler
      const result = await handler(req, res);

      Logger.info('Request processing completed', {
        requestId,
        method: req.method,
        url: req.url
      });

      return result;

    } catch (error) {
      Logger.error('Middleware error', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      if (!res.headersSent) {
        return createErrorResponse(res, 500, 'Internal server error');
      }
    }
  };
};

// Export mock versions of authentication functions
const mockAuthenticate = authenticate;
const mockRequirePermission = (permission) => {
  return (req, res, next) => {
    Logger.info(`Mock permission check for: ${permission} - always passes`);
    req.user = mockUser;
    next();
  };
};

const mockRequireRole = (role) => {
  return (req, res, next) => {
    Logger.info(`Mock role check for: ${role} - always passes`);
    req.user = mockUser;
    next();
  };
};

const mockRequireAnyRole = (roles) => {
  return (req, res, next) => {
    Logger.info(`Mock role check for any of: ${roles.join(', ')} - always passes`);
    req.user = mockUser;
    next();
  };
};

// Mock admin and manager middleware
const mockAdminOnly = mockRequireRole('admin');
const mockManagerOrAdmin = mockRequireAnyRole(['manager', 'admin']);

module.exports = {
  withMiddleware,
  authenticate: mockAuthenticate,
  requirePermission: mockRequirePermission,
  requireRole: mockRequireRole,
  requireAnyRole: mockRequireAnyRole,
  adminOnly: mockAdminOnly,
  managerOrAdmin: mockManagerOrAdmin,
  createErrorResponse,
  createSuccessResponse,
  Logger,
  // Export mock user for consistency
  mockUser
};
