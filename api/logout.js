// User Logout Endpoint
// Secure logout with token invalidation and audit logging

const jwt = require('jsonwebtoken');
const { SessionSecurityService } = require('./lib/session-security');
const { verifyAccessToken, JWT_CONFIG } = require('./lib/middleware');

// Configuration validation
if (!JWT_CONFIG.ACCESS_SECRET) {
  throw new Error('JWT_SECRET must be configured for logout');
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
    service: 'logout',
    message,
    timestamp: new Date().toISOString(),
    ...context
  }));
}

// Extract and verify token using standardized verification
function extractAndVerifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);

  // Check if token is already blacklisted
  if (SessionSecurityService.isTokenBlacklisted(token)) {
    return { valid: false, error: 'Token has been revoked' };
  }

  // Use standardized token verification
  const verificationResult = verifyAccessToken(token);
  if (!verificationResult.success) {
    return { valid: false, error: verificationResult.error };
  }

  return { valid: true, decoded: verificationResult.payload, token };
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
    const userId = decoded.userId;
    const sessionId = decoded.sessionId;

    // Blacklist the current token
    const tokenExpiry = decoded.exp * 1000; // Convert to milliseconds
    SessionSecurityService.blacklistToken(token, tokenExpiry);

    // Invalidate the specific session if sessionId is available
    if (sessionId) {
      SessionSecurityService.invalidateSession(sessionId);
    }

    // Clear any failed login attempts for this user
    SessionSecurityService.clearFailedAttempts(userId, 'user');

    // Log successful logout with security details
    log('security', 'User logout successful - token blacklisted and session invalidated', {
      ...requestContext,
      userId,
      email: decoded.email,
      sessionId,
      tokenExpiry: new Date(tokenExpiry).toISOString(),
      blacklistedToken: token.substring(0, 20) + '...' // Log partial token for debugging
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful - session terminated',
      timestamp: new Date().toISOString(),
      sessionInvalidated: !!sessionId
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
