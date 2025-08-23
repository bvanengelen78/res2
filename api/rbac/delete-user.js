// RBAC Delete User Endpoint
// DELETE /api/rbac/delete-user
// Deactivates a user account (admin only)

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
const deleteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Main handler
const deleteUserHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId } = validatedData;

    Logger.info('RBAC delete user request', {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId
    });

    if (!supabase) {
      return createErrorResponse(res, 500, 'Database service unavailable');
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      Logger.warn('Admin attempted to delete themselves', { 
        userId, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 400, 'You cannot deactivate your own account');
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      Logger.warn('Delete user failed - user not found', { 
        userId, 
        adminUserId: user.id,
        error: fetchError?.message
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    if (!existingUser.is_active) {
      Logger.warn('Delete user failed - user already deactivated', { 
        userId, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 400, 'User is already deactivated');
    }

    // Deactivate user profile
    const { data: deactivatedUser, error: deactivateError } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('id', userId)
      .select()
      .single();

    if (deactivateError) {
      Logger.error('Failed to deactivate user profile', deactivateError, { 
        userId, 
        adminUserId: user.id 
      });
      throw new Error(`Profile deactivation error: ${deactivateError.message}`);
    }

    // Deactivate all user roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .update({ 
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('user_id', userId);

    if (rolesError) {
      Logger.warn('Failed to deactivate user roles', rolesError, { 
        userId, 
        adminUserId: user.id 
      });
    }

    // Deactivate associated resource if exists
    if (existingUser.resource_id) {
      const { error: resourceError } = await supabase
        .from('resources')
        .update({ 
          isActive: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id
        })
        .eq('id', existingUser.resource_id);

      if (resourceError) {
        Logger.warn('Failed to deactivate associated resource', resourceError, { 
          resourceId: existingUser.resource_id,
          userId, 
          adminUserId: user.id 
        });
      }
    }

    Logger.info('User deactivated successfully', { 
      userId: deactivatedUser.id, 
      email: deactivatedUser.email,
      adminUserId: user.id
    });

    return createSuccessResponse(res, {
      message: 'User deactivated successfully',
      user: {
        id: deactivatedUser.id,
        email: deactivatedUser.email,
        firstName: deactivatedUser.first_name,
        lastName: deactivatedUser.last_name,
        fullName: deactivatedUser.full_name,
        isActive: deactivatedUser.is_active,
        deactivatedAt: deactivatedUser.deactivated_at,
        deactivatedBy: deactivatedUser.deactivated_by
      }
    });

  } catch (error) {
    Logger.error('Delete user failed', error, { 
      userId: validatedData.userId, 
      adminUserId: user.id 
    });
    return createErrorResponse(res, 500, error.message || 'Failed to deactivate user');
  }
};

// Export with middleware
module.exports = withMiddleware(deleteUserHandler, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
  validateSchema: deleteUserSchema,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 user deletions per minute max
  }
});
