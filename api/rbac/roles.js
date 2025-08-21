// RBAC Roles Endpoint
// Provides role definitions and permissions for Role Management section

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  'regular_user': ['time_logging', 'dashboard'],
  'change_lead': ['time_logging', 'change_lead_reports', 'dashboard', 'reports'],
  'manager_change': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
  'business_controller': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
  'admin': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management']
};

// Get all available roles with their permissions
function getAllRoles() {
  return Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
    role,
    permissions
  }));
}

// Main handler
const rbacRolesHandler = async (req, res, { user }) => {
  try {
    Logger.info('RBAC Roles request', { 
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

    // Get all roles with their permissions
    const roles = getAllRoles();

    Logger.info('RBAC Roles response', { 
      roleCount: roles.length,
      requestUserId: user.id
    });

    return createSuccessResponse(res, roles);

  } catch (error) {
    Logger.error('RBAC Roles error', { 
      error: error.message, 
      stack: error.stack,
      userId: user?.id 
    });

    return createErrorResponse(res, 500, 'Failed to fetch roles');
  }
};

// Export with middleware
module.exports = withMiddleware(rbacRolesHandler, {
  requireAuth: true,
  validateInput: false,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 requests per minute
  }
});
