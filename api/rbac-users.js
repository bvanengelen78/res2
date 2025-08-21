// RBAC Users Endpoint - Alternative implementation
// Provides user management data for Role Management section in Settings page

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

// Main handler
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
    console.log('[RBAC_USERS] Starting request');

    if (!supabase) {
      console.log('[RBAC_USERS] Using fallback data');
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 1,
            email: 'admin@resourceflow.com',
            resourceId: null,
            roles: [{ id: 1, role: 'admin', resourceId: null }],
            permissions: ROLE_PERMISSIONS['admin'],
            resource: null
          }
        ],
        timestamp: new Date().toISOString()
      });
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
      console.error('[RBAC_USERS] Database error:', usersError);
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

    console.log('[RBAC_USERS] Success:', users.length, 'users found');

    return res.status(200).json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RBAC_USERS] Error:', error);
    
    return res.status(500).json({
      error: true,
      message: 'Failed to fetch users',
      timestamp: new Date().toISOString()
    });
  }
};
