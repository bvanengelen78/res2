// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');

/**
 * Authentication test endpoint for debugging RBAC issues
 * This endpoint helps verify that real database authentication is working
 */
const authTestHandler = async (req, res, { user }) => {
  try {
    console.log('[AUTH_TEST] Starting authentication test', {
      method: req.method,
      timestamp: new Date().toISOString(),
      hasUser: !!user,
      userId: user?.id
    });

    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    // Detailed user information for debugging
    const userInfo = {
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        roles: user.roles?.map(r => ({
          id: r.id,
          role: r.role,
          resourceId: r.resourceId,
          assignedAt: r.assignedAt
        })),
        permissions: user.permissions,
        resource: user.resource ? {
          id: user.resource.id,
          name: user.resource.name,
          role: user.resource.role
        } : null
      } : null,
      permissionChecks: user ? {
        hasSystemAdmin: user.permissions?.includes('system_admin'),
        hasSettings: user.permissions?.includes('settings'),
        hasUserManagement: user.permissions?.includes('user_management'),
        hasResourceManagement: user.permissions?.includes('resource_management')
      } : null,
      roleChecks: user ? {
        isAdmin: user.roles?.some(r => r.role === 'admin'),
        isManagerChange: user.roles?.some(r => r.role === 'manager_change'),
        isBusinessController: user.roles?.some(r => r.role === 'business_controller')
      } : null
    };

    console.log('[AUTH_TEST] User authentication details', {
      userId: user?.id,
      email: user?.email,
      rolesCount: user?.roles?.length || 0,
      permissionsCount: user?.permissions?.length || 0,
      hasSystemAdmin: user?.permissions?.includes('system_admin'),
      roles: user?.roles?.map(r => r.role),
      permissions: user?.permissions
    });

    // Test specific permission for Settings access
    const canAccessSettings = user?.permissions?.includes('system_admin');
    
    const response = {
      success: true,
      data: {
        ...userInfo,
        settingsAccess: {
          canAccess: canAccessSettings,
          reason: canAccessSettings 
            ? 'User has system_admin permission' 
            : 'User lacks system_admin permission (required for Settings access)',
          requiredPermission: 'system_admin',
          userPermissions: user?.permissions || []
        },
        timestamp: new Date().toISOString(),
        source: 'real_database_authentication'
      }
    };

    console.log('[AUTH_TEST] Returning authentication test results', {
      canAccessSettings,
      userPermissions: user?.permissions,
      rolesCount: user?.roles?.length
    });

    return createSuccessResponse(res, response.data);

  } catch (error) {
    console.error('[AUTH_TEST] Critical error in auth test', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return createErrorResponse(res, 500, `Authentication test failed: ${error.message}`);
  }
};

// Export the handler with authentication required
module.exports = withMiddleware(
  authTestHandler,
  {
    requireAuth: true
  }
);
