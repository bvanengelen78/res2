// RBAC Roles Hierarchy Endpoint
// GET /api/rbac/roles-hierarchy
// Returns roles with their assigned permissions

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getRolesWithPermissions() {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('roles')
    .select(`
      id,
      name,
      display_name,
      description,
      is_active,
      role_permissions (
        permissions (
          id,
          name,
          description,
          category,
          is_active
        )
      )
    `)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data || []).map(role => ({
    id: role.id,
    name: role.name,
    display_name: role.display_name,
    description: role.description,
    is_active: role.is_active,
    permissions: (role.role_permissions || [])
      .map(rp => rp.permissions)
      .filter(Boolean)
  }));
}

const rolesHierarchyHandler = async (req, res, { user }) => {
  try {
    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    Logger.info('Roles hierarchy request', { userId: user?.id });

    const roles = await getRolesWithPermissions();
    return createSuccessResponse(res, { data: roles });
  } catch (error) {
    Logger.error('Roles hierarchy error', error);
    return createErrorResponse(res, 500, 'Failed to fetch roles hierarchy');
  }
};

module.exports = withMiddleware(rolesHierarchyHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  requiredPermissions: ['user_management'],
});
