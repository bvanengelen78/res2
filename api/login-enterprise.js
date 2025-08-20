// Enterprise-grade login endpoint with database authentication
// Production-ready with comprehensive security, audit logging, and error handling

const { AuthenticationService, AuthLogger } = require('./lib/auth-service');

// Security headers configuration
function setSecurityHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// Request context extraction
function extractRequestContext(req) {
  return {
    method: req.method,
    url: req.url,
    clientIP: req.headers['x-forwarded-for'] || 
              req.headers['x-real-ip'] || 
              req.connection?.remoteAddress || 
              req.socket?.remoteAddress ||
              'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    contentType: req.headers['content-type'],
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Enhanced input validation
function validateLoginRequest(body) {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Request body must be valid JSON',
      code: 'INVALID_JSON'
    };
  }

  const { email, password, rememberMe } = body;

  // Email validation
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required and must be a string',
      code: 'INVALID_EMAIL_TYPE'
    };
  }

  if (email.trim().length === 0) {
    return {
      valid: false,
      error: 'Email cannot be empty',
      code: 'EMPTY_EMAIL'
    };
  }

  if (email.length > 254) {
    return {
      valid: false,
      error: 'Email is too long',
      code: 'EMAIL_TOO_LONG'
    };
  }

  // Email format validation (RFC 5322 compliant)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email.trim())) {
    return {
      valid: false,
      error: 'Invalid email format',
      code: 'INVALID_EMAIL_FORMAT'
    };
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password is required and must be a string',
      code: 'INVALID_PASSWORD_TYPE'
    };
  }

  if (password.length === 0) {
    return {
      valid: false,
      error: 'Password cannot be empty',
      code: 'EMPTY_PASSWORD'
    };
  }

  if (password.length > 1000) {
    return {
      valid: false,
      error: 'Password is too long',
      code: 'PASSWORD_TOO_LONG'
    };
  }

  // RememberMe validation
  if (rememberMe !== undefined && typeof rememberMe !== 'boolean') {
    return {
      valid: false,
      error: 'RememberMe must be a boolean',
      code: 'INVALID_REMEMBER_ME'
    };
  }

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
      rememberMe: Boolean(rememberMe)
    }
  };
}

// Error response formatter
function createErrorResponse(res, statusCode, message, code = null, context = {}) {
  const errorResponse = {
    error: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (code) {
    errorResponse.code = code;
  }

  // Add additional context for specific error types (without exposing sensitive data)
  if (statusCode === 429 && context.retryAfter) {
    errorResponse.retryAfter = context.retryAfter;
  }

  return res.status(statusCode).json(errorResponse);
}

// Success response formatter
function createSuccessResponse(res, data) {
  return res.status(200).json(data);
}

// Main handler function
module.exports = async function handler(req, res) {
  const requestContext = extractRequestContext(req);
  
  // Set security headers
  setSecurityHeaders(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    AuthLogger.info('Preflight request handled', requestContext);
    return res.status(200).end();
  }

  // Method validation
  if (req.method !== 'POST') {
    AuthLogger.warn('Invalid method attempted', {
      ...requestContext,
      allowedMethods: ['POST']
    });
    return createErrorResponse(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    AuthLogger.info('Enterprise login request started', requestContext);

    // Input validation
    const validation = validateLoginRequest(req.body);
    if (!validation.valid) {
      AuthLogger.warn('Login request validation failed', {
        ...requestContext,
        validationError: validation.error,
        validationCode: validation.code
      });
      return createErrorResponse(res, 400, validation.error, validation.code);
    }

    const { email, password, rememberMe } = validation.data;

    // Authenticate user
    const authResult = await AuthenticationService.authenticateUser(
      email,
      password,
      requestContext.clientIP,
      requestContext.userAgent,
      rememberMe
    );

    if (!authResult.success) {
      // Handle different types of authentication failures
      let statusCode = 401;
      let responseContext = {};

      switch (authResult.code) {
        case 'ACCOUNT_LOCKED':
          statusCode = 429;
          responseContext.retryAfter = Math.ceil((new Date(authResult.unlockTime) - new Date()) / 1000);
          break;
        case 'ACCOUNT_DISABLED':
          statusCode = 403;
          break;
        case 'SYSTEM_ERROR':
          statusCode = 500;
          break;
        default:
          statusCode = 401;
      }

      AuthLogger.security('Authentication failed', {
        ...requestContext,
        email,
        errorCode: authResult.code,
        errorMessage: authResult.error
      });

      return createErrorResponse(res, statusCode, authResult.error, authResult.code, responseContext);
    }

    // Authentication successful
    AuthLogger.security('Authentication successful', {
      ...requestContext,
      userId: authResult.user.id,
      email: authResult.user.email,
      roles: authResult.user.roles.map(r => r.role),
      sessionDuration: rememberMe ? '30d' : '1d'
    });

    return createSuccessResponse(res, {
      user: authResult.user,
      tokens: authResult.tokens,
      sessionInfo: authResult.sessionInfo
    });

  } catch (error) {
    AuthLogger.error('Critical error in enterprise login', error, requestContext);

    // Don't expose internal errors in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Authentication service temporarily unavailable' 
      : `Authentication error: ${error.message}`;

    return createErrorResponse(res, 500, errorMessage, 'SYSTEM_ERROR');
  }
};
