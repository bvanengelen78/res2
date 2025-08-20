// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Debug endpoint to analyze JWT tokens
 * This helps diagnose authentication issues
 */
const debugTokenHandler = async (req, res) => {
  try {
    console.log('[DEBUG_TOKEN] Starting token analysis', {
      method: req.method,
      timestamp: new Date().toISOString()
    });

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    
    const response = {
      timestamp: new Date().toISOString(),
      authHeader: {
        present: !!authHeader,
        format: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer format' : 'Invalid format') : 'Missing',
        length: authHeader ? authHeader.length : 0
      },
      token: null,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
        JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
      }
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      response.token = {
        length: token.length,
        preview: token.substring(0, 50) + '...',
        valid: false,
        decoded: null,
        error: null
      };

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        response.token.valid = true;
        response.token.decoded = {
          // Core fields
          userId: decoded.userId,
          userIdType: typeof decoded.userId,
          email: decoded.email,
          
          // User object (alternative format)
          hasUserObject: !!decoded.user,
          userObjectId: decoded.user?.id,
          userObjectEmail: decoded.user?.email,
          
          // Roles and permissions
          roles: decoded.roles,
          permissions: Array.isArray(decoded.permissions) ? `Array(${decoded.permissions.length})` : decoded.permissions,
          
          // Token metadata
          iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
          exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
          
          // All keys in token
          allKeys: Object.keys(decoded),
          
          // Analysis
          extractedUserId: decoded.userId || decoded.user?.id,
          tokenFormat: decoded.userId ? 'express_format' : (decoded.user?.id ? 'vercel_format' : 'unknown_format'),
          isExpired: decoded.exp ? (Date.now() / 1000) > decoded.exp : false
        };

        console.log('[DEBUG_TOKEN] Token analysis complete', {
          valid: true,
          userId: response.token.decoded.extractedUserId,
          format: response.token.decoded.tokenFormat,
          expired: response.token.decoded.isExpired
        });

      } catch (tokenError) {
        response.token.error = {
          message: tokenError.message,
          name: tokenError.name
        };

        console.log('[DEBUG_TOKEN] Token validation failed', {
          error: tokenError.message,
          tokenPreview: token.substring(0, 50) + '...'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[DEBUG_TOKEN] Critical error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      message: error.message
    });
  }
};

// Export the handler directly (no middleware needed for debugging)
module.exports = debugTokenHandler;
