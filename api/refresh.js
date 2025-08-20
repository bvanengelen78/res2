// Token Refresh Endpoint
// Secure token refresh with validation and new token generation

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
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
    service: 'refresh',
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

  const { refreshToken } = body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return { valid: false, error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' };
  }

  return {
    valid: true,
    data: { refreshToken }
  };
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if this is a refresh token
    if (!decoded.userId) {
      throw new Error('Invalid refresh token format');
    }

    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Get user data for new token
async function getUserData(userId) {
  try {
    if (!supabase) {
      // Fallback for development
      return {
        id: userId,
        email: 'user@example.com',
        resource_id: null,
        roles: [{ role: 'regular_user' }]
      };
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, resource_id, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      throw new Error('User not found or inactive');
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    return {
      ...user,
      roles: roles || [{ role: 'regular_user' }]
    };
  } catch (error) {
    log('error', 'Error fetching user data', { userId, error: error.message });
    throw error;
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
    log('info', 'Token refresh request', requestContext);

    // Input validation
    const validation = validateInput(req.body);
    if (!validation.valid) {
      log('warn', 'Refresh validation failed', { ...requestContext, error: validation.error });
      return res.status(400).json({
        error: true,
        message: validation.error,
        code: validation.code,
        timestamp: new Date().toISOString()
      });
    }

    const { refreshToken } = validation.data;

    // Check configuration
    if (!JWT_SECRET) {
      log('error', 'JWT_SECRET not configured', requestContext);
      return res.status(500).json({
        error: true,
        message: 'Token refresh service unavailable',
        code: 'SYSTEM_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Verify refresh token
    const tokenResult = verifyRefreshToken(refreshToken);
    if (!tokenResult.valid) {
      log('warn', 'Invalid refresh token', { ...requestContext, error: tokenResult.error });
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    const { decoded } = tokenResult;
    const userId = decoded.userId;

    // Get current user data
    const userData = await getUserData(userId);

    // Generate new tokens
    const newAccessToken = jwt.sign(
      { user: { id: userData.id, email: userData.email, resourceId: userData.resource_id } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const newRefreshToken = jwt.sign(
      { userId: userData.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Prepare response
    const responseData = {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    log('security', 'Token refresh successful', {
      ...requestContext,
      userId: userData.id,
      email: userData.email
    });

    return res.status(200).json(responseData);

  } catch (error) {
    log('error', 'Critical error in token refresh', { ...requestContext, error: error.message, stack: error.stack });

    return res.status(500).json({
      error: true,
      message: 'Token refresh service temporarily unavailable',
      code: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};
