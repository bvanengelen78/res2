const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for authentication
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Logger utility
const Logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message, data) => console.error(`[ERROR] ${message}`, data || '')
};

// Response helpers
const createErrorResponse = (res, status, message) => res.status(status).json({ error: message });
const createSuccessResponse = (res, data) => res.json(data);

// Supabase authentication function
const authenticate = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'Authentication required',
        message: 'No valid authorization header found' 
      };
    }

    const token = authHeader.substring(7);

    if (!supabase) {
      return { 
        success: false, 
        error: 'Authentication service unavailable',
        message: 'Supabase not configured' 
      };
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { 
        success: false, 
        error: 'Invalid token',
        message: 'Authentication failed' 
      };
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      Logger.warn('Error fetching user profile:', profileError);
    }

    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError) {
      Logger.warn('Error fetching user roles:', rolesError);
    }

    // Get user permissions through roles
    const { data: permissions, error: permError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          role_permissions (
            permissions (
              name
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (permError) {
      Logger.warn('Error fetching user permissions:', permError);
    }

    // Extract permissions from the nested structure
    const userPermissions = [];
    if (permissions) {
      permissions.forEach(userRole => {
        if (userRole.roles?.role_permissions) {
          userRole.roles.role_permissions.forEach(rolePermission => {
            if (rolePermission.permissions?.name) {
              userPermissions.push(rolePermission.permissions.name);
            }
          });
        }
      });
    }

    // Build user object
    const authenticatedUser = {
      id: user.id,
      email: user.email,
      roles: userRoles?.map(ur => ur.roles?.name).filter(Boolean) || [],
      permissions: [...new Set(userPermissions)], // Remove duplicates
      resourceId: userProfile?.resource_id,
      profile: userProfile
    };

    Logger.info('User authenticated successfully', {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      rolesCount: authenticatedUser.roles.length,
      permissionsCount: authenticatedUser.permissions.length
    });

    return { success: true, user: authenticatedUser };

  } catch (error) {
    Logger.error('Authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication failed',
      message: error.message 
    };
  }
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

      // Authentication (now async)
      let user = null;
      if (requireAuth) {
        const authResult = await authenticate(req);
        if (!authResult.success) {
          return createErrorResponse(res, 401, authResult.error || authResult.message);
        }
        user = authResult.user;
      }

      // Input validation
      let validatedData = null;
      if (validateSchema) {
        const inputData = req.method === 'GET' ? req.query : req.body;

        try {
          // Use Zod schema validation
          validatedData = validateSchema.parse(inputData);
          Logger.info('Input validation successful', {
            requestId,
            method: req.method,
            fieldsValidated: Object.keys(validatedData)
          });
        } catch (validationError) {
          Logger.warn('Input validation failed', {
            requestId,
            method: req.method,
            error: validationError.message,
            issues: validationError.issues || []
          });

          // Format Zod validation errors
          const errorMessage = validationError.issues
            ? validationError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
            : validationError.message;

          return createErrorResponse(res, 400, `Validation error: ${errorMessage}`);
        }
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
      
      // Log completion
      const duration = Date.now() - startTime;
      Logger.info('Request completed', {
        requestId,
        duration,
        userId: user?.id
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration,
        userId: req.user?.id
      });

      return createErrorResponse(res, 500, 'Internal server error');
    }
  };
};

// Updated middleware exports
module.exports = {
  Logger,
  authenticate,
  validateInput: () => ({ success: true }),
  createErrorResponse,
  createSuccessResponse,
  withMiddleware,
  withRetry: (fn) => fn,
  JWT_CONFIG: {},
  generateAccessToken: () => null,
  generateRefreshToken: () => null,
  verifyAccessToken: () => ({ success: false }),
  verifyRefreshToken: () => ({ success: false }),
  ConfigSecurityService: { getSecureConfig: () => ({}), initialize: () => {} },
  secureConfig: {},
  securityLogger: { logSecurityEvent: () => {} },
  SecureErrorHandler: {},
  LOGGING_CONFIG: {},
  SecurityHeadersService: {
    initialize: () => {},
    applyHeaders: (res, req) => {
      // Basic CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    },
    handlePreflight: (req, res) => {
      res.status(200).end();
    }
  },
  SECURITY_HEADERS_CONFIG: {},
  AuthorizationService: {}
};
