// Admin Password Audit Endpoint
// GET /api/admin/users/[userId]/password-audit
// Retrieves password reset audit trail for a user (admin only)

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../../../lib/middleware');
const { DatabaseService } = require('../../../lib/supabase');

// Main handler
const passwordAuditHandler = async (req, res, { user }) => {
  try {
    const { userId } = req.query;
    const targetUserId = parseInt(userId);
    const adminUserId = user.id;

    Logger.info('Admin password audit request', {
      adminUserId,
      targetUserId,
      adminEmail: user.email
    });

    // Validate target user exists
    const targetUser = await DatabaseService.getUser(targetUserId);
    if (!targetUser) {
      Logger.warn('Password audit failed - user not found', { 
        targetUserId, 
        adminUserId 
      });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Get password reset audit trail for the user
    const auditTrail = await DatabaseService.getPasswordResetAuditForUser(targetUserId);
    
    Logger.info('Password audit retrieved', {
      targetUserId,
      adminUserId,
      auditEntryCount: auditTrail.length
    });

    // Format audit trail for response
    const formattedAuditTrail = auditTrail.map(entry => ({
      id: entry.id,
      action: entry.action,
      timestamp: entry.timestamp,
      adminUser: {
        id: entry.adminUserId,
        email: entry.adminUser?.email || 'Unknown'
      },
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent ? entry.userAgent.substring(0, 100) : 'Unknown', // Truncate for display
      success: entry.success,
      details: entry.details || {},
      createdAt: entry.createdAt
    }));

    return createSuccessResponse(res, {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.resource?.name || targetUser.email
      },
      auditTrail: formattedAuditTrail,
      summary: {
        totalEntries: formattedAuditTrail.length,
        lastReset: formattedAuditTrail.length > 0 ? formattedAuditTrail[0].timestamp : null,
        successfulResets: formattedAuditTrail.filter(entry => entry.success).length,
        failedResets: formattedAuditTrail.filter(entry => !entry.success).length
      }
    });

  } catch (error) {
    Logger.error('Password audit error', {
      error: error.message,
      stack: error.stack,
      adminUserId: user?.id,
      targetUserId: req.query?.userId
    });

    return createErrorResponse(res, 500, 'Failed to retrieve password audit');
  }
};

// Export with middleware
module.exports = withMiddleware(passwordAuditHandler, {
  requireAuth: true,
  requirePermissions: ['user_management'], // Admin permission required
  allowedMethods: ['GET'],
  validateSchema: null, // No body validation needed for GET
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 audit requests per minute max
  }
});
