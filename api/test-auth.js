// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Simple authentication test endpoint
 * This tests the middleware authentication without complex logic
 */
module.exports = async (req, res) => {
  try {
    console.log('[TEST_AUTH] Starting authentication test', {
      method: req.method,
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPreview: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none'
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      console.log('[TEST_AUTH] Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      console.log('[TEST_AUTH] Method not allowed', { method: req.method });
      return res.status(405).json({
        error: true,
        message: `Method ${req.method} not allowed`,
        timestamp: new Date().toISOString()
      });
    }

    // Manual authentication check (bypass middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[TEST_AUTH] Missing or invalid authorization header');
      return res.status(401).json({
        error: true,
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    console.log('[TEST_AUTH] Extracted token', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 50) + '...'
    });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('[TEST_AUTH] Token verification successful', {
        hasUserId: !!decoded.userId,
        hasUserObject: !!decoded.user,
        userObjectId: decoded.user?.id,
        email: decoded.email || decoded.user?.email,
        tokenKeys: Object.keys(decoded)
      });
    } catch (tokenError) {
      console.error('[TEST_AUTH] Token verification failed', {
        error: tokenError.message,
        tokenPreview: token.substring(0, 50) + '...'
      });
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Test userId extraction (same logic as middleware)
    let userId = decoded.userId || decoded.user?.id;

    if (!userId) {
      console.error('[TEST_AUTH] Token missing userId', {
        decoded: {
          hasUserId: !!decoded.userId,
          hasUserObject: !!decoded.user,
          userObjectId: decoded.user?.id,
          tokenKeys: Object.keys(decoded)
        }
      });
      return res.status(401).json({
        error: true,
        message: 'Invalid token structure',
        timestamp: new Date().toISOString()
      });
    }

    console.log('[TEST_AUTH] Authentication successful', {
      userId,
      tokenFormat: decoded.userId ? 'express' : 'vercel',
      email: decoded.email || decoded.user?.email
    });

    const response = {
      success: true,
      authenticated: true,
      user: {
        id: userId,
        email: decoded.email || decoded.user?.email,
        tokenFormat: decoded.userId ? 'express_format' : 'vercel_format',
        extractedUserId: userId,
        roles: decoded.roles || 'not_in_token',
        permissions: decoded.permissions || 'not_in_token'
      },
      token: {
        valid: true,
        structure: {
          hasUserId: !!decoded.userId,
          hasUserObject: !!decoded.user,
          userObjectId: decoded.user?.id,
          tokenKeys: Object.keys(decoded)
        }
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('[TEST_AUTH] Critical error in auth test', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    try {
      return res.status(500).json({
        error: true,
        message: `Authentication test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } catch (responseError) {
      console.error('[TEST_AUTH] Failed to send error response', responseError);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Authentication test failed: ${error.message}`);
    }
  }
};
