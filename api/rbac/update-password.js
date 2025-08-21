// RBAC Update Password Endpoint
// POST /api/rbac/update-password
// Updates a user's password (admin only)

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');
const bcrypt = require('bcryptjs');

// Input validation schema
const updatePasswordSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one digit')
});

// Main handler
const updatePasswordHandler = async (req, res, { user, validatedData }) => {
  try {
    const { userId, newPassword } = validatedData;

    Logger.info('RBAC update password request', {
      adminUserId: user.id,
      targetUserId: userId,
      adminEmail: user.email
    });

    // Get user to verify they exist
    const targetUser = await DatabaseService.getUser(userId);
    if (!targetUser) {
      Logger.warn('Update password failed - user not found', { 
        targetUserId: userId, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Additional password strength validation
    if (newPassword.length < 6) {
      return createErrorResponse(res, 400, 'Password must be at least 6 characters long');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    Logger.info('Password hashed successfully', { 
      targetUserId: userId, 
      adminUserId: user.id 
    });

    // Update the password
    await DatabaseService.updateUserPassword(userId, hashedPassword);
    Logger.info('Password updated successfully', { 
      targetUserId: userId, 
      adminUserId: user.id,
      targetUserEmail: targetUser.email
    });

    // Log the action for audit purposes
    Logger.info('Password updated by admin', {
      targetUser: {
        id: targetUser.id,
        email: targetUser.email
      },
      admin: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date().toISOString()
    });

    return createSuccessResponse(res, {
      message: 'Password updated successfully',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.resource?.name || targetUser.email
      }
    });

  } catch (error) {
    Logger.error('Failed to update password', {
      error: error.message,
      stack: error.stack,
      adminUserId: user?.id,
      targetUserId: req.body?.userId
    });

    return createErrorResponse(res, 500, 'Failed to update password');
  }
};

// Export with middleware
module.exports = withMiddleware(updatePasswordHandler, {
  requireAuth: true,
  requirePermissions: ['user_management'], // Admin permission required
  allowedMethods: ['POST'],
  validateSchema: {
    POST: updatePasswordSchema
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 password updates per minute max
  }
});
