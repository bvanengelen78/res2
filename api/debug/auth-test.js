// Authentication Flow Test Endpoint
// GET /api/debug/auth-test

const { withMiddleware } = require('../lib/middleware');

const authTestHandler = async (req, res, { user }) => {
  try {
    console.log('[AUTH-TEST] Authentication test started');
    console.log('[AUTH-TEST] User authenticated:', {
      id: user.id,
      email: user.email,
      hasPermissions: !!user.permissions,
      permissionCount: user.permissions?.length || 0
    });

    // Test user permissions
    const hasUserManagement = user.permissions?.includes('user_management');
    const hasAdminAccess = user.permissions?.includes('admin_access');

    // Test database access with authenticated user context
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists in user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, resource_id')
      .eq('id', user.id)
      .single();

    console.log('[AUTH-TEST] User profile lookup:', {
      found: !!userProfile,
      error: profileError?.message || null
    });

    // Check user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        is_active,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    console.log('[AUTH-TEST] User roles lookup:', {
      found: !!userRoles,
      count: userRoles?.length || 0,
      error: rolesError?.message || null
    });

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      authentication: {
        userId: user.id,
        email: user.email,
        authenticated: true
      },
      permissions: {
        total: user.permissions?.length || 0,
        hasUserManagement,
        hasAdminAccess,
        allPermissions: user.permissions || []
      },
      database: {
        userProfile: {
          found: !!userProfile,
          error: profileError?.message || null,
          data: userProfile ? {
            id: userProfile.id,
            email: userProfile.email,
            name: `${userProfile.first_name} ${userProfile.last_name}`,
            hasResource: !!userProfile.resource_id
          } : null
        },
        userRoles: {
          found: !!userRoles,
          count: userRoles?.length || 0,
          error: rolesError?.message || null,
          roles: userRoles?.map(ur => ({
            roleId: ur.role_id,
            roleName: ur.roles?.name,
            isActive: ur.is_active
          })) || []
        }
      },
      message: 'Authentication test completed successfully'
    });

  } catch (error) {
    console.error('[AUTH-TEST] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      message: 'Authentication test failed'
    });
  }
};

// Export with middleware (requires authentication)
module.exports = withMiddleware(authTestHandler, {
  requireAuth: true,
  allowedMethods: ['GET']
});
