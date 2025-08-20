// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');
const { z } = require('zod');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Enhanced logging utility
const Logger = {
  info: (message, context = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  error: (message, error = null, context = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  warn: (message, context = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};

// Authentication middleware with real database queries
const authenticate = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get real user data from database instead of using token data
    const { DatabaseService } = require('./supabase');

    if (!decoded.userId) {
      Logger.error('Token missing userId', null, { decoded });
      return { success: false, error: 'Invalid token structure' };
    }

    // Query real user data with roles and permissions
    const userWithRoles = await DatabaseService.getUserWithRoles(decoded.userId);

    if (!userWithRoles) {
      Logger.error('User not found in database', null, { userId: decoded.userId });
      return { success: false, error: 'User not found' };
    }

    Logger.info('User authenticated with real database data', {
      userId: userWithRoles.id,
      email: userWithRoles.email,
      roles: userWithRoles.roles?.map(r => r.role),
      permissions: userWithRoles.permissions
    });

    return { success: true, user: userWithRoles };
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

// Error response utility
const createErrorResponse = (res, statusCode, message, details = null) => {
  const errorResponse = {
    error: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  Logger.error(`HTTP ${statusCode}: ${message}`, null, { details });
  return res.status(statusCode).json(errorResponse);
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
      // Set CORS and security headers
      Object.entries({ ...CORS_HEADERS, ...SECURITY_HEADERS }).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

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
  CORS_HEADERS,
  SECURITY_HEADERS
};
