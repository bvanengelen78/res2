// RBAC Users Endpoint
// Provides user management data for Role Management section in Settings page

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');

// Configuration
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

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  'regular_user': ['time_logging', 'dashboard'],
  'change_lead': ['time_logging', 'change_lead_reports', 'dashboard', 'reports'],
  'manager_change': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
  'business_controller': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
  'admin': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management']
};

// Get all users with their roles and permissions
async function getAllUsersWithRoles() {
  try {
    if (!supabase) {
      // Fallback data for development
      return [
        {
          id: 1,
          email: 'admin@resourceflow.com',
          resourceId: null,
          roles: [{ id: 1, role: 'admin', resourceId: null }],
          permissions: ROLE_PERMISSIONS['admin'],
          resource: null
        }
      ];
    }

    // Get all users with their roles and resource information
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        resource_id,
        is_active,
        user_roles (
          id,
          role,
          resource_id,
          assigned_at,
          assigned_by
        ),
        resources (
          id,
          name,
          email,
          role,
          department
        )
      `)
      .eq('is_active', true)
      .order('id');

    if (usersError) {
      throw usersError;
    }

    // Transform the data to match the expected format
    const users = usersData.map(user => {
      // Get all permissions from user roles
      const allPermissions = new Set();
      const roles = user.user_roles.map(userRole => {
        const rolePermissions = ROLE_PERMISSIONS[userRole.role] || [];
        rolePermissions.forEach(permission => allPermissions.add(permission));
        
        return {
          id: userRole.id,
          role: userRole.role,
          resourceId: userRole.resource_id
        };
      });

      return {
        id: user.id,
        email: user.email,
        resourceId: user.resource_id,
        roles: roles,
        permissions: Array.from(allPermissions),
        resource: user.resources ? {
          id: user.resources.id,
          name: user.resources.name,
          email: user.resources.email,
          role: user.resources.role,
          department: user.resources.department
        } : null
      };
    });

    return users;

  } catch (error) {
    Logger.error('Error fetching users with roles', { error: error.message });
    throw error;
  }
}

// Main handler
const rbacUsersHandler = async (req, res, { user }) => {
  try {
    Logger.info('RBAC Users request', { 
      method: req.method, 
      userId: user?.id,
      hasRoleManagementPermission: user?.permissions?.includes('role_management')
    });

    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    // Check if user has role management permission
    if (!user?.permissions?.includes('role_management')) {
      return createErrorResponse(res, 403, 'Insufficient permissions for role management');
    }

    // Get all users with their roles and permissions
    const users = await getAllUsersWithRoles();

    Logger.info('RBAC Users response', { 
      userCount: users.length,
      requestUserId: user.id
    });

    return createSuccessResponse(res, users);

  } catch (error) {
    Logger.error('RBAC Users error', { 
      error: error.message, 
      stack: error.stack,
      userId: user?.id 
    });

    return createErrorResponse(res, 500, 'Failed to fetch users');
  }
};

// Export with middleware
module.exports = withMiddleware(rbacUsersHandler, {
  requireAuth: true,
  validateInput: false,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 requests per minute
  }
});
