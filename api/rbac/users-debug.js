// RBAC Users Debug Endpoint
// Simplified version to debug the 500 error

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

// Simple handler without middleware
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: true,
      message: `Method ${req.method} not allowed`,
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('[RBAC_USERS_DEBUG] Starting request');
    console.log('[RBAC_USERS_DEBUG] Supabase available:', !!supabase);
    console.log('[RBAC_USERS_DEBUG] Environment check:', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_KEY
    });

    if (!supabase) {
      console.log('[RBAC_USERS_DEBUG] Using fallback data');
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 1,
            email: 'admin@resourceflow.com',
            resourceId: null,
            roles: [{ id: 1, role: 'admin', resourceId: null }],
            permissions: ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management'],
            resource: null
          }
        ],
        timestamp: new Date().toISOString()
      });
    }

    console.log('[RBAC_USERS_DEBUG] Attempting database query');

    // Simple query first
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, resource_id, is_active')
      .eq('is_active', true)
      .limit(10);

    if (usersError) {
      console.error('[RBAC_USERS_DEBUG] Users query error:', usersError);
      throw usersError;
    }

    console.log('[RBAC_USERS_DEBUG] Users data:', usersData?.length || 0, 'users found');

    // Get user roles separately
    const userIds = usersData.map(u => u.id);
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id, role, resource_id')
      .in('user_id', userIds);

    if (rolesError) {
      console.error('[RBAC_USERS_DEBUG] Roles query error:', rolesError);
      throw rolesError;
    }

    console.log('[RBAC_USERS_DEBUG] Roles data:', rolesData?.length || 0, 'roles found');

    // Get resources separately
    const resourceIds = usersData.map(u => u.resource_id).filter(Boolean);
    let resourcesData = [];
    if (resourceIds.length > 0) {
      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('id, name, email, role, department')
        .in('id', resourceIds);

      if (resourcesError) {
        console.error('[RBAC_USERS_DEBUG] Resources query error:', resourcesError);
        throw resourcesError;
      }

      resourcesData = resources || [];
    }

    console.log('[RBAC_USERS_DEBUG] Resources data:', resourcesData?.length || 0, 'resources found');

    // Transform the data
    const ROLE_PERMISSIONS = {
      'regular_user': ['time_logging', 'dashboard'],
      'change_lead': ['time_logging', 'change_lead_reports', 'dashboard', 'reports'],
      'manager_change': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
      'business_controller': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
      'admin': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management']
    };

    const users = usersData.map(user => {
      const userRoles = rolesData.filter(r => r.user_id === user.id);
      const userResource = resourcesData.find(r => r.id === user.resource_id);

      // Get all permissions from user roles
      const allPermissions = new Set();
      const roles = userRoles.map(userRole => {
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
        resource: userResource ? {
          id: userResource.id,
          name: userResource.name,
          email: userResource.email,
          role: userResource.role,
          department: userResource.department
        } : null
      };
    });

    console.log('[RBAC_USERS_DEBUG] Transformed users:', users.length);

    return res.status(200).json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RBAC_USERS_DEBUG] Error:', error);
    
    return res.status(500).json({
      error: true,
      message: 'Failed to fetch users',
      debug: {
        errorMessage: error.message,
        errorName: error.name,
        hasSupabase: !!supabase
      },
      timestamp: new Date().toISOString()
    });
  }
};
