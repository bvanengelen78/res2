// User Registration Endpoint
// Enterprise-grade user registration with database integration and security

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BCRYPT_SALT_ROUNDS = 12;

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
    service: 'register',
    message,
    timestamp: new Date().toISOString(),
    ...context
  }));
}

// Input validation
function validateInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be valid JSON', code: 'INVALID_JSON' };
  }

  const { email, password, resourceId } = body;

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { valid: false, error: 'Valid email is required', code: 'INVALID_EMAIL' };
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: 'Password is required', code: 'INVALID_PASSWORD' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' };
  }

  if (resourceId && (typeof resourceId !== 'number' || resourceId <= 0)) {
    return { valid: false, error: 'Resource ID must be a positive number', code: 'INVALID_RESOURCE_ID' };
  }

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
      resourceId: resourceId || null
    }
  };
}

// Check if user exists
async function checkUserExists(email) {
  try {
    if (!supabase) return false;

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    log('error', 'Error checking user existence', { email, error: error.message });
    throw error;
  }
}

// Create user in database
async function createUser(email, hashedPassword, resourceId) {
  try {
    if (!supabase) {
      throw new Error('Database not available');
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        resource_id: resourceId,
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    log('error', 'Error creating user', { email, error: error.message });
    throw error;
  }
}

// Assign default role to user
async function assignDefaultRole(userId) {
  try {
    if (!supabase) return;

    await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'regular_user',
        assigned_at: new Date().toISOString()
      });
  } catch (error) {
    log('warn', 'Failed to assign default role', { userId, error: error.message });
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
    log('info', 'User registration request', requestContext);

    // Input validation
    const validation = validateInput(req.body);
    if (!validation.valid) {
      log('warn', 'Registration validation failed', { ...requestContext, error: validation.error });
      return res.status(400).json({
        error: true,
        message: validation.error,
        code: validation.code,
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, resourceId } = validation.data;

    // Check configuration
    if (!JWT_SECRET) {
      log('error', 'JWT_SECRET not configured', requestContext);
      return res.status(500).json({
        error: true,
        message: 'Registration service unavailable',
        code: 'SYSTEM_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user already exists
    const userExists = await checkUserExists(email);
    if (userExists) {
      log('warn', 'Registration failed - user already exists', { ...requestContext, email });
      return res.status(409).json({
        error: true,
        message: 'User already exists',
        code: 'USER_EXISTS',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await createUser(email, hashedPassword, resourceId);

    // Assign default role
    await assignDefaultRole(user.id);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { user: { id: user.id, email: user.email, resourceId: user.resource_id } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Prepare response
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resource_id,
        roles: [{ role: 'regular_user' }],
        permissions: ['time_logging', 'reports', 'dashboard', 'calendar', 'submission_overview'],
        resource: resourceId ? { id: resourceId, name: 'New User', role: 'User' } : null
      },
      tokens: {
        accessToken,
        refreshToken
      },
      sessionInfo: {
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    };

    log('security', 'User registration successful', {
      ...requestContext,
      userId: user.id,
      email: user.email
    });

    return res.status(201).json(responseData);

  } catch (error) {
    log('error', 'Critical error in user registration', { ...requestContext, error: error.message, stack: error.stack });

    return res.status(500).json({
      error: true,
      message: 'Registration service temporarily unavailable',
      code: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};
