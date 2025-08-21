// RBAC Remove Role Endpoint
// Removes roles from users for Role Management functionality

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

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

// Input validation schema
const removeRoleSchema = z.object({
  userId: z.number().min(1, 'User ID is required'),
  role: z.enum(['regular_user', 'change_lead', 'manager_change', 'business_controller', 'admin'], {
    errorMap: () => ({ message: 'Invalid role specified' })
  }),
  resourceId: z.number().optional()
});

// Remove role from user
async function removeRoleFromUser(userId, role, resourceId) {
  try {
    if (!supabase) {
      throw new Error('Database not available');
    }

    // Build the query conditions
    let query = supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    // Add resource_id condition if provided
    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    } else {
      query = query.is('resource_id', null);
    }

    const { data, error } = await query.select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Role assignment not found');
    }

    Logger.info('Role removed successfully', {
      userId,
      role,
      resourceId,
      removedCount: data.length
    });

    return {
      success: true,
      message: `Role ${role} removed from user`,
      removedCount: data.length
    };

  } catch (error) {
    Logger.error('Error removing role', { 
      error: error.message, 
      userId, 
      role, 
      resourceId 
    });
    throw error;
  }
}

// Main handler
const removeRoleHandler = async (req, res, { user, validatedData }) => {
  try {
    Logger.info('RBAC Remove Role request', { 
      method: req.method, 
      userId: user?.id,
      data: validatedData
    });

    if (req.method !== 'POST') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    // Check if user has role management permission
    if (!user?.permissions?.includes('role_management')) {
      return createErrorResponse(res, 403, 'Insufficient permissions for role management');
    }

    const { userId, role, resourceId } = validatedData;

    // Prevent users from removing their own admin role
    if (userId === user.id && role === 'admin') {
      return createErrorResponse(res, 400, 'Cannot remove your own admin role');
    }

    // Remove the role
    const result = await removeRoleFromUser(userId, role, resourceId);

    Logger.info('RBAC Remove Role success', { 
      userId,
      role,
      resourceId,
      removedBy: user.id,
      result
    });

    return createSuccessResponse(res, result);

  } catch (error) {
    Logger.error('RBAC Remove Role error', { 
      error: error.message, 
      stack: error.stack,
      userId: user?.id,
      data: req.body
    });

    // Return specific error messages for common issues
    if (error.message.includes('Role assignment not found')) {
      return createErrorResponse(res, 404, 'Role assignment not found');
    }

    return createErrorResponse(res, 500, 'Failed to remove role');
  }
};

// Export with middleware
module.exports = withMiddleware(removeRoleHandler, {
  requireAuth: true,
  validateInput: removeRoleSchema,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 role removals per minute
  }
});
