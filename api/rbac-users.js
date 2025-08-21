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
    console.log('[RBAC_USERS] Supabase available:', !!supabase);

    let users = [];

    if (supabase) {
      console.log('[RBAC_USERS] Querying database for real user role data');

      // Get all users with their role assignments and resource information
      // Note: We need to specify the exact foreign key because user_roles has two FKs to users table
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          resource_id,
          role,
          assigned_at,
          user:users!user_roles_user_id_fkey(id, email),
          resource:resources(id, name, email, role, department)
        `)
        .order('assigned_at', { ascending: true });

      if (userRolesError) {
        console.error('[RBAC_USERS] Database query error:', userRolesError);
        throw userRolesError;
      }

      console.log('[RBAC_USERS] Raw user roles data:', userRoles?.length || 0, 'role assignments');

      // Group roles by user and build the response structure
      const userMap = new Map();

      for (const userRole of userRoles || []) {
        const userId = userRole.user.id;
        const userEmail = userRole.user.email;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            email: userEmail,
            resourceId: userRole.resource_id,
            roles: [],
            permissions: new Set(),
            resource: userRole.resource
          });
        }

        const user = userMap.get(userId);

        // Add this role to the user's roles array
        user.roles.push({
          id: userRole.id,
          role: userRole.role,
          resourceId: userRole.resource_id
        });

        // Add permissions for this role
        const rolePermissions = ROLE_PERMISSIONS[userRole.role] || [];
        rolePermissions.forEach(permission => user.permissions.add(permission));

        // Update resource info if this role has a resource
        if (userRole.resource && !user.resource) {
          user.resource = userRole.resource;
        }
      }

      // Convert to array and finalize permissions
      users = Array.from(userMap.values()).map(user => ({
        ...user,
        permissions: Array.from(user.permissions)
      }));

      console.log('[RBAC_USERS] Processed users:', users.length);
      users.forEach(user => {
        console.log(`[RBAC_USERS] User ${user.email}: ${user.roles.length} roles`);
      });

    } else {
      console.log('[RBAC_USERS] Database unavailable, using fallback data');

      users = [
        {
          id: 1,
          email: 'admin@resourceflow.com',
          resourceId: null,
          roles: [{ id: 1, role: 'admin', resourceId: null }],
          permissions: ROLE_PERMISSIONS['admin'],
          resource: null
        },
        {
          id: 2,
          email: 'rob.beckers@swisssense.nl',
          resourceId: 2,
          roles: [{ id: 2, role: 'regular_user', resourceId: 2 }],
          permissions: ROLE_PERMISSIONS['regular_user'],
          resource: {
            id: 2,
            name: 'Rob Beckers',
            email: 'rob.beckers@swisssense.nl',
            role: 'Domain Architect',
            department: 'IT Architecture & Delivery'
          }
        },
        {
          id: 3,
          email: 'richard.voorburg@swisssense.nl',
          resourceId: 21,
          roles: [{ id: 3, role: 'admin', resourceId: 21 }],
          permissions: ROLE_PERMISSIONS['admin'],
          resource: {
            id: 21,
            name: 'Richard Voorburg',
            email: 'richard.voorburg@swisssense.nl',
            role: 'Manager Change',
            department: 'IT Architecture & Delivery'
          }
        }
      ];
    }

    console.log('[RBAC_USERS] Success:', users.length, 'users returned');

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
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
