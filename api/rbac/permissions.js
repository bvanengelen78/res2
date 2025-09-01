// RBAC Permissions Endpoint
// GET /api/rbac/permissions

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAllPermissions() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

const permissionsHandler = async (req, res, { user }) => {
  try {
    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    Logger.info('Permissions request', { userId: user?.id });

    const permissions = await getAllPermissions();
    return createSuccessResponse(res, { data: permissions });
  } catch (error) {
    Logger.error('Permissions error', error);
    return createErrorResponse(res, 500, 'Failed to fetch permissions');
  }
};

module.exports = withMiddleware(permissionsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  requiredPermissions: ['user_management'],
});
