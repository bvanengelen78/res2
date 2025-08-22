// Simplified Enterprise Authentication Endpoint
// Uses direct Supabase client without complex DatabaseService dependencies

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { generateAccessToken, generateRefreshToken, JWT_CONFIG } = require('./lib/middleware');
const { PasswordSecurityService } = require('./lib/password-security');
const { SessionSecurityService } = require('./lib/session-security');
const { InputValidationService, loginSchema } = require('./lib/input-validation');
const { RateLimitingService, RATE_LIMIT_CONFIG } = require('./lib/rate-limiting');

// Configuration validation is now handled by ConfigSecurityService
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Security headers
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

// Enhanced logging
function log(level, message, context = {}) {
  console.log(JSON.stringify({
    level,
    service: 'auth-enterprise-simple',
    message,
    timestamp: new Date().toISOString(),
    ...context
  }));
}

// Note: Input validation now handled by InputValidationService

// Get user from database
async function getUserByEmail(email) {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, password, resource_id, is_active, email_verified, last_login')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    log('error', 'Database error fetching user', { email, error: error.message });
    throw error;
  }
}

// Get user roles
async function getUserRoles(userId) {
  try {
    if (!supabase) {
      return [{ role: 'admin' }]; // Fallback for development
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role, assigned_at')
      .eq('user_id', userId);

    if (error) {
      log('error', 'Database error fetching user roles', { userId, error: error.message });
      return [{ role: 'admin' }]; // Fallback
    }

    return data || [{ role: 'admin' }];
  } catch (error) {
    log('error', 'Error fetching user roles', { userId, error: error.message });
    return [{ role: 'admin' }]; // Fallback
  }
}

// Get permissions for roles
function getPermissionsForRoles(roles) {
  const allPermissions = [
    'time_logging', 'reports', 'change_lead_reports', 'resource_management',
    'project_management', 'user_management', 'system_admin', 'dashboard',
    'calendar', 'submission_overview', 'settings', 'role_management'
  ];

  if (roles.some(role => role.role === 'admin')) {
    return allPermissions;
  }

  return ['time_logging', 'reports', 'dashboard', 'calendar', 'submission_overview'];
}

// Update last login
async function updateLastLogin(userId) {
  try {
    if (!supabase) return;

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    log('warn', 'Failed to update last login', { userId, error: error.message });
  }
}

// Get resource data with intelligent fallback for users without resource records
async function getResourceData(resourceId, userEmail) {
  try {
    // If we have a resourceId and Supabase is available, try to fetch from database
    if (supabase && resourceId) {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, role')
        .eq('id', resourceId)
        .single();

      if (!error && data) {
        return data;
      }
    }

    // Fallback: Create meaningful user data from email
    const displayName = userEmail ? createDisplayNameFromEmail(userEmail) : 'User';
    const role = userEmail && userEmail.includes('admin') ? 'Administrator' : 'User';

    return {
      id: resourceId || null,
      name: displayName,
      role: role
    };
  } catch (error) {
    // Fallback: Create meaningful user data from email
    const displayName = userEmail ? createDisplayNameFromEmail(userEmail) : 'User';
    const role = userEmail && userEmail.includes('admin') ? 'Administrator' : 'User';

    return {
      id: resourceId || null,
      name: displayName,
      role: role
    };
  }
}

// Helper function to create a display name from email
function createDisplayNameFromEmail(email) {
  if (!email) return 'User';

  // Extract the part before @ and clean it up
  const localPart = email.split('@')[0];

  // Handle common patterns
  if (localPart.includes('.')) {
    // Convert "john.doe" to "John Doe"
    return localPart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  } else if (localPart.includes('_')) {
    // Convert "john_doe" to "John Doe"
    return localPart
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  } else {
    // Convert "admin" to "Admin"
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
  }
}

// Main handler
module.exports = async function handler(req, res) {
  const requestContext = {
    method: req.method,
    clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString()
  };

  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: true,
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    });
  }

  try {
    log('info', 'Enterprise authentication request', requestContext);

    // Comprehensive input validation and sanitization
    const validation = InputValidationService.validateInput(loginSchema, req.body);
    if (!validation.success) {
      log('warn', 'Input validation failed', {
        ...requestContext,
        error: validation.error,
        details: validation.details
      });
      return res.status(400).json({
        error: true,
        message: validation.error,
        details: validation.details,
        code: validation.code,
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, rememberMe } = validation.data;
    const clientIP = requestContext.clientIP;
    const userAgent = requestContext.userAgent;

    // Comprehensive rate limiting
    const rateLimitResult = RateLimitingService.checkRateLimit(clientIP, 'auth_login', RATE_LIMIT_CONFIG.AUTH_LOGIN);
    if (!rateLimitResult.allowed) {
      log('security', 'Login blocked - rate limit exceeded', {
        ...requestContext,
        email,
        limit: rateLimitResult.limit,
        retryAfter: rateLimitResult.retryAfter
      });
      return res.status(429).json({
        error: true,
        message: rateLimitResult.message,
        code: 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        timestamp: new Date().toISOString()
      });
    }

    // Detect suspicious activity
    const suspiciousActivity = RateLimitingService.detectSuspiciousActivity('auth_login', clientIP, userAgent, { email });
    if (suspiciousActivity.suspicious) {
      log('security', 'Suspicious login activity detected', {
        ...requestContext,
        email,
        reasons: suspiciousActivity.reasons,
        requestCount: suspiciousActivity.requestCount
      });
      // Continue but with enhanced logging
    }

    // Check for rate limiting - IP-based
    const ipLockout = SessionSecurityService.isLockedOut(clientIP, 'ip');
    if (ipLockout.locked) {
      log('security', 'Login blocked - IP rate limit exceeded', { ...requestContext, email, lockoutUntil: new Date(ipLockout.lockoutUntil).toISOString() });
      return res.status(429).json({
        error: true,
        message: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((ipLockout.lockoutUntil - Date.now()) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Check for rate limiting - user-based
    const userLockout = SessionSecurityService.isLockedOut(email, 'user');
    if (userLockout.locked) {
      log('security', 'Login blocked - user rate limit exceeded', { ...requestContext, email, lockoutUntil: new Date(userLockout.lockoutUntil).toISOString() });
      return res.status(429).json({
        error: true,
        message: 'Account temporarily locked due to multiple failed attempts.',
        code: 'ACCOUNT_LOCKED',
        retryAfter: Math.ceil((userLockout.lockoutUntil - Date.now()) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Configuration is validated by ConfigSecurityService on startup

    // Get user from database
    const user = await getUserByEmail(email);
    if (!user) {
      // Record failed attempt for both IP and user using both services
      SessionSecurityService.recordFailedAttempt(clientIP, 'ip');
      SessionSecurityService.recordFailedAttempt(email, 'user');
      RateLimitingService.recordFailedAttempt(clientIP, 'ip');
      RateLimitingService.recordFailedAttempt(email, 'user');

      log('security', 'Authentication failed - user not found', { ...requestContext, email });
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password using secure password service
    const passwordVerification = await PasswordSecurityService.verifyPassword(password, user.password);
    if (!passwordVerification.success || !passwordVerification.isValid) {
      // Record failed attempt for both IP and user using both services
      SessionSecurityService.recordFailedAttempt(clientIP, 'ip');
      SessionSecurityService.recordFailedAttempt(email, 'user');
      RateLimitingService.recordFailedAttempt(clientIP, 'ip');
      RateLimitingService.recordFailedAttempt(email, 'user');

      log('security', 'Authentication failed - invalid password', {
        ...requestContext,
        userId: user.id,
        email,
        verificationError: passwordVerification.error
      });
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
    }

    // Clear failed login attempts on successful authentication using both services
    SessionSecurityService.clearFailedAttempts(clientIP, 'ip');
    SessionSecurityService.clearFailedAttempts(email, 'user');
    RateLimitingService.clearFailedAttempts(clientIP, 'ip');
    RateLimitingService.clearFailedAttempts(email, 'user');

    // Create secure session
    const session = SessionSecurityService.createSession(user.id, userAgent, clientIP, rememberMe);

    // Get user roles and permissions
    const userRoles = await getUserRoles(user.id);
    const permissions = getPermissionsForRoles(userRoles);

    // Generate standardized JWT tokens with session ID
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      resourceId: user.resource_id,
      roles: userRoles.map(r => r.role),
      permissions: permissions,
      sessionId: session.id,
      rememberMe: rememberMe
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await updateLastLogin(user.id);

    // Get resource data with user email for intelligent fallback
    const resourceData = await getResourceData(user.resource_id, user.email);

    // Prepare response
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resource_id,
        roles: userRoles.map(role => ({ role: role.role })),
        permissions,
        resource: resourceData
      },
      tokens: {
        accessToken,
        refreshToken
      },
      sessionInfo: {
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString()
      }
    };

    log('security', 'Authentication successful', {
      ...requestContext,
      userId: user.id,
      email: user.email,
      roles: userRoles.map(r => r.role)
    });

    return res.status(200).json(responseData);

  } catch (error) {
    log('error', 'Critical error in enterprise authentication', { ...requestContext, error: error.message, stack: error.stack });

    return res.status(500).json({
      error: true,
      message: 'Authentication service temporarily unavailable',
      code: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};
