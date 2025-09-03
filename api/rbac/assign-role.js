// RBAC Assign Role Endpoint
// POST /api/rbac/assign-role
// Assigns a role to a user (admin only)

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
const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  roleName: z.string().min(1, 'Role name is required'),
});

// Note: Old assignRoleToUser function removed - using new RBAC schema

// Main handler
const assignRoleHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId, roleName } = validatedData;

    Logger.info('RBAC assign role request', {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      roleName
    });

    if (!supabase) {
      return createErrorResponse(res, 500, 'Database service unavailable');
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      Logger.warn('Assign role failed - user not found', {
        userId,
        adminUserId: user.id,
        error: fetchError?.message
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    if (!existingUser.is_active) {
      Logger.warn('Assign role failed - user is deactivated', {
        userId,
        adminUserId: user.id
      });
      return createErrorResponse(res, 400, 'Cannot assign role to deactivated user');
    }

    // Get role ID from roles table
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .eq('name', roleName)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData) {
      Logger.error('Failed to find role', roleError, { roleName });
      return createErrorResponse(res, 400, `Role not found: ${roleName}`);
    }

    // Deactivate existing roles first
    const { error: deactivateError } = await supabase
      .from('user_roles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) {
      Logger.error('Failed to deactivate existing roles', deactivateError, {
        userId,
        adminUserId: user.id
      });
      throw new Error(`Failed to deactivate existing roles: ${deactivateError.message}`);
    }

    // Assign new role
    const { data: newRoleAssignment, error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleData.id,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        is_active: true,
      })
      .select(`
        id,
        assigned_at,
        assigned_by,
        is_active,
        roles (
          id,
          name,
          display_name,
          description
        )
      `)
      .single();

    if (assignError) {
      Logger.error('Failed to assign role', assignError, {
        userId,
        roleId: roleData.id,
        adminUserId: user.id
      });
      throw new Error(`Role assignment error: ${assignError.message}`);
    }

    Logger.info('Role assigned successfully', {
      userId,
      roleName,
      roleId: roleData.id,
      assignmentId: newRoleAssignment.id,
      adminUserId: user.id
    });

    return createSuccessResponse(res, {
      message: 'Role assigned successfully',
      assignment: {
        id: newRoleAssignment.id,
        userId: userId,
        role: newRoleAssignment.roles,
        assignedAt: newRoleAssignment.assigned_at,
        assignedBy: newRoleAssignment.assigned_by,
        isActive: newRoleAssignment.is_active
      },
      user: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        fullName: existingUser.full_name
      }
    });

  } catch (error) {
    Logger.error('Assign role failed', error, {
      userId: validatedData.userId,
      roleName: validatedData.roleName,
      adminUserId: user.id
    });
    return createErrorResponse(res, 500, error.message || 'Failed to assign role');
  }
};

// Export with middleware
module.exports = withMiddleware(assignRoleHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: assignRoleSchema,
  requiredPermissions: ['role_management'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 role assignments per minute
  }
});
