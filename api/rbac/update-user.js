// RBAC Update User Endpoint
// PUT /api/rbac/update-user
// Updates user profile information (admin only)

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
const updateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim()
    .optional(),
  isActive: z.boolean().optional(),
  department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .trim()
    .optional(),
  jobRole: z.string()
    .max(100, 'Job role must be less than 100 characters')
    .trim()
    .optional(),
});

// Main handler
const updateUserHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId, firstName, lastName, email, isActive, department, jobRole } = validatedData;

    Logger.info('RBAC update user request', {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      updateFields: Object.keys(validatedData).filter(key => key !== 'userId')
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
      Logger.warn('Update user failed - user not found', { 
        userId, 
        adminUserId: user.id,
        error: fetchError?.message
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Prevent admin from deactivating themselves
    if (userId === user.id && isActive === false) {
      Logger.warn('Admin attempted to deactivate themselves', { 
        userId, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 400, 'You cannot deactivate your own account');
    }

    // Build update object
    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (email !== undefined) updateData.email = email;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    // Update full name if first or last name changed
    if (firstName !== undefined || lastName !== undefined) {
      const newFirstName = firstName !== undefined ? firstName : existingUser.first_name;
      const newLastName = lastName !== undefined ? lastName : existingUser.last_name;
      updateData.full_name = `${newFirstName} ${newLastName}`;
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update user profile', updateError, { 
        userId, 
        adminUserId: user.id 
      });
      throw new Error(`Profile update error: ${updateError.message}`);
    }

    // Update associated resource if department or job role changed
    if ((department !== undefined || jobRole !== undefined) && existingUser.resource_id) {
      const resourceUpdateData = {};
      if (department !== undefined) resourceUpdateData.department = department;
      if (jobRole !== undefined) resourceUpdateData.role = jobRole;

      if (Object.keys(resourceUpdateData).length > 0) {
        const { error: resourceError } = await supabase
          .from('resources')
          .update(resourceUpdateData)
          .eq('id', existingUser.resource_id);

        if (resourceError) {
          Logger.warn('Failed to update associated resource', resourceError, { 
            resourceId: existingUser.resource_id,
            userId, 
            adminUserId: user.id 
          });
        }
      }
    }

    Logger.info('User updated successfully', { 
      userId: updatedUser.id, 
      email: updatedUser.email,
      adminUserId: user.id,
      updatedFields: Object.keys(updateData)
    });

    return createSuccessResponse(res, {
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        fullName: updatedUser.full_name,
        isActive: updatedUser.is_active,
        resourceId: updatedUser.resource_id,
      }
    });

  } catch (error) {
    Logger.error('Update user failed', error, { 
      userId: validatedData.userId, 
      adminUserId: user.id 
    });
    return createErrorResponse(res, 500, error.message || 'Failed to update user');
  }
};

// Export with middleware
module.exports = withMiddleware(updateUserHandler, {
  requireAuth: true,
  allowedMethods: ['PUT'],
  validateSchema: updateUserSchema,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 20 // 20 user updates per minute max
  }
});
