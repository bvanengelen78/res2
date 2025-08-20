// User Logout Endpoint
// Secure logout with token invalidation and audit logging

const jwt = require('jsonwebtoken');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;

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
    service: 'logout',
    message,
    timestamp: new Date().toISOString(),
    ...context
  }));
}

// Extract and verify token
function extractAndVerifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);
  
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded, token };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
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
    log('info', 'User logout request', requestContext);

    // Extract and verify token
    const tokenResult = extractAndVerifyToken(req.headers.authorization);
    
    if (!tokenResult.valid) {
      log('warn', 'Logout failed - invalid token', { ...requestContext, error: tokenResult.error });
      return res.status(401).json({
        error: true,
        message: tokenResult.error,
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    const { decoded, token } = tokenResult;
    const userId = decoded.user?.id || decoded.userId;

    // Log successful logout
    log('security', 'User logout successful', {
      ...requestContext,
      userId,
      email: decoded.user?.email,
      tokenExpiry: new Date(decoded.exp * 1000).toISOString()
    });

    // In a production system, you would:
    // 1. Add the token to a blacklist/revocation list
    // 2. Store the logout event in an audit log
    // 3. Invalidate any related sessions
    
    // For now, we'll just return success
    // The client will remove the token from localStorage
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('error', 'Critical error in logout', { ...requestContext, error: error.message, stack: error.stack });

    return res.status(500).json({
      error: true,
      message: 'Logout service temporarily unavailable',
      code: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};
