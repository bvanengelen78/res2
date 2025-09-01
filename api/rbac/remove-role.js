// RBAC Remove Role Endpoint
// POST /api/rbac/remove-role
// Removes a role assignment from a user (admin only)

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Input validation schema
const removeRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  roleName: z.string().min(1, 'Role name is required'),
});

// Main handler
const removeRoleHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId, roleName } = validatedData;

    Logger.info('RBAC remove role request', {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      roleName
    });

    if (!supabase) {
      return createErrorResponse(res, 500, 'Database service unavailable');
    }

    // Validate target user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, is_active')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      Logger.warn('Remove role failed - user not found', { userId, fetchError });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Get role ID by name
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', roleName)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData) {
      Logger.warn('Remove role failed - role not found', { roleName, roleError });
      return createErrorResponse(res, 404, `Role not found: ${roleName}`);
    }

    // Find active assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_roles')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('role_id', roleData.id)
      .eq('is_active', true)
      .single();

    if (assignmentError || !assignment) {
      Logger.warn('Remove role failed - no active assignment', { userId, roleName });
      return createErrorResponse(res, 400, 'User does not have this role');
    }

    // Soft delete the assignment
    const { error: removeError } = await supabase
      .from('user_roles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('id', assignment.id);

    if (removeError) {
      Logger.error('Remove role update failed', removeError, { assignmentId: assignment.id });
      return createErrorResponse(res, 500, `Failed to remove role: ${removeError.message}`);
    }

    Logger.info('Role removed', { userId, roleName, assignmentId: assignment.id });

    return createSuccessResponse(res, {
      message: 'Role removed successfully',
      removedAssignmentId: assignment.id,
      role: roleData,
      user: existingUser
    });
  } catch (error) {
    Logger.error('Remove role failed', error, { userId: user?.id });
    return createErrorResponse(res, 500, error.message || 'Failed to remove role');
  }
};

// Export with middleware
module.exports = withMiddleware(removeRoleHandler, {
  requireAuth: true,
  allowedMethods: ['POST'],
  validateSchema: removeRoleSchema,
  rateLimit: { windowMs: 60 * 1000, max: 10 }
});
