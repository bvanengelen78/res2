const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { withMiddleware } = require('../lib/middleware');
const { createErrorResponse } = require('../lib/response-utils');
const { Logger } = require('../lib/logger');

// Validation schema
const changePasswordSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
});

// Main handler
const changePasswordHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId, newPassword } = validatedData;

    Logger.info('RBAC change password request', {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId
    });

    if (!supabase) {
      return createErrorResponse(res, 500, 'Database service unavailable');
    }

    // Check if target user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      Logger.warn('Change password failed - user not found', {
        userId,
        adminUserId: user.id,
        error: fetchError?.message
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Prevent admin from changing their own password through this endpoint
    if (userId === user.id) {
      Logger.warn('Admin attempted to change their own password through admin endpoint', { 
        userId, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 400, 'Use profile settings to change your own password');
    }

    // Update password using Supabase Admin API
    const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword,
        email_confirm: true // Ensure email remains confirmed
      }
    );

    if (updateError) {
      Logger.error('Failed to update user password', {
        userId,
        adminUserId: user.id,
        error: updateError.message,
        errorCode: updateError.code
      });

      // Handle specific Supabase errors
      if (updateError.message.includes('User not found')) {
        return createErrorResponse(res, 404, 'User not found in authentication system');
      }
      
      if (updateError.message.includes('Password')) {
        return createErrorResponse(res, 400, `Password update failed: ${updateError.message}`);
      }

      return createErrorResponse(res, 500, `Failed to update password: ${updateError.message}`);
    }

    if (!updateResult.user) {
      Logger.error('Password update returned no user data', {
        userId,
        adminUserId: user.id
      });
      return createErrorResponse(res, 500, 'Password update failed - no user data returned');
    }

    Logger.info('Password updated successfully', {
      userId,
      adminUserId: user.id,
      targetUserEmail: updateResult.user.email
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {
        userId: updateResult.user.id,
        email: updateResult.user.email,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    Logger.error('Failed to change password', {
      error: error.message,
      stack: error.stack,
      adminUserId: user?.id,
      requestData: {
        userId: req.body?.userId
      }
    });

    // Return detailed error information for debugging
    const errorDetails = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    // Log the full error for server-side debugging
    console.error('[CHANGE-PASSWORD] Full error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      cause: error.cause
    });

    return createErrorResponse(res, 500, `Failed to change password: ${error.message}`, errorDetails);
  }
};

// Export with middleware
module.exports = withMiddleware(changePasswordHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: changePasswordSchema,
  requiredPermissions: ['user_management'], // Add required permission
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 3 // 3 password changes per minute max
  }
});
