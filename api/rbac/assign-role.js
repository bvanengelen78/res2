// RBAC Assign Role Endpoint
// Assigns roles to users for Role Management functionality

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
const assignRoleSchema = z.object({
  resourceId: z.number().min(1, 'Resource ID is required'),
  role: z.enum(['regular_user', 'change_lead', 'manager_change', 'business_controller', 'admin'], {
    errorMap: () => ({ message: 'Invalid role specified' })
  })
});

// Assign role to user
async function assignRoleToUser(resourceId, role, assignedBy) {
  try {
    if (!supabase) {
      throw new Error('Database not available');
    }

    // First, check if the resource exists
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, name, email')
      .eq('id', resourceId)
      .single();

    if (resourceError || !resource) {
      throw new Error('Resource not found');
    }

    // Check if user exists for this resource
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, resource_id')
      .eq('resource_id', resourceId)
      .single();

    if (userError || !user) {
      throw new Error('User not found for this resource');
    }

    // Check if role already exists
    const { data: existingRole, error: existingRoleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', role)
      .eq('resource_id', resourceId)
      .single();

    if (existingRole) {
      throw new Error('User already has this role');
    }

    // Assign the role
    const { data: newRole, error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        resource_id: resourceId,
        role: role,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy
      })
      .select()
      .single();

    if (assignError) {
      throw assignError;
    }

    Logger.info('Role assigned successfully', {
      userId: user.id,
      resourceId,
      role,
      assignedBy,
      roleId: newRole.id
    });

    return {
      success: true,
      message: `Role ${role} assigned to ${resource.name}`,
      roleId: newRole.id
    };

  } catch (error) {
    Logger.error('Error assigning role', { 
      error: error.message, 
      resourceId, 
      role, 
      assignedBy 
    });
    throw error;
  }
}

// Main handler
const assignRoleHandler = async (req, res, { user, validatedData }) => {
  try {
    Logger.info('RBAC Assign Role request', { 
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

    const { resourceId, role } = validatedData;

    // Assign the role
    const result = await assignRoleToUser(resourceId, role, user.id);

    Logger.info('RBAC Assign Role success', { 
      resourceId,
      role,
      assignedBy: user.id,
      result
    });

    return createSuccessResponse(res, result);

  } catch (error) {
    Logger.error('RBAC Assign Role error', { 
      error: error.message, 
      stack: error.stack,
      userId: user?.id,
      data: req.body
    });

    // Return specific error messages for common issues
    if (error.message.includes('Resource not found')) {
      return createErrorResponse(res, 404, 'Resource not found');
    }
    if (error.message.includes('User not found')) {
      return createErrorResponse(res, 404, 'User not found for this resource');
    }
    if (error.message.includes('already has this role')) {
      return createErrorResponse(res, 409, 'User already has this role');
    }

    return createErrorResponse(res, 500, 'Failed to assign role');
  }
};

// Export with middleware
module.exports = withMiddleware(assignRoleHandler, {
  requireAuth: true,
  allowedMethods: ['POST'],
  validateSchema: assignRoleSchema,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 role assignments per minute
  }
});
