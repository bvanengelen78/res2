// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication debugging endpoint
 * This endpoint helps debug JWT token structure and authentication issues
 */
const authDebugHandler = async (req, res, { user }) => {
  try {
    console.log('[AUTH_DEBUG] Starting authentication debug', {
      method: req.method,
      timestamp: new Date().toISOString(),
      hasUser: !!user,
      userId: user?.id
    });

    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    // Get the raw token for analysis
    const authHeader = req.headers.authorization;
    let tokenAnalysis = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        tokenAnalysis = {
          valid: true,
          structure: {
            hasUserId: !!decoded.userId,
            hasUserObject: !!decoded.user,
            userObjectId: decoded.user?.id,
            email: decoded.email || decoded.user?.email,
            roles: decoded.roles || 'not_in_token',
            permissions: decoded.permissions ? 'present' : 'not_in_token',
            tokenKeys: Object.keys(decoded)
          },
          extractedUserId: decoded.userId || decoded.user?.id,
          tokenFormat: decoded.userId ? 'express_format' : 'vercel_format'
        };
      } catch (tokenError) {
        tokenAnalysis = {
          valid: false,
          error: tokenError.message,
          tokenPreview: token.substring(0, 50) + '...'
        };
      }
    }

    // Detailed authentication information
    const authInfo = {
      authenticated: !!user,
      tokenAnalysis,
      user: user ? {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        roles: user.roles?.map(r => ({
          role: r.role,
          resourceId: r.resourceId
        })),
        permissions: user.permissions,
        resource: user.resource ? {
          id: user.resource.id,
          name: user.resource.name,
          role: user.resource.role
        } : null,
        dataSource: user.roles?.length > 0 ? 'database' : 'token_fallback'
      } : null,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    };

    console.log('[AUTH_DEBUG] Authentication analysis complete', {
      authenticated: !!user,
      tokenValid: tokenAnalysis?.valid,
      tokenFormat: tokenAnalysis?.tokenFormat,
      userDataSource: user?.roles?.length > 0 ? 'database' : 'token_fallback',
      userPermissions: user?.permissions?.length || 0
    });

    return createSuccessResponse(res, authInfo);

  } catch (error) {
    console.error('[AUTH_DEBUG] Critical error in auth debug', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return createErrorResponse(res, 500, `Authentication debug failed: ${error.message}`);
  }
};

// Export the handler with authentication required
module.exports = withMiddleware(
  authDebugHandler,
  {
    requireAuth: true,
    allowedMethods: ['GET']
  }
);
