const { withMiddleware, Logger, createSuccessResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Main user profile handler
const meHandler = async (req, res, { user }) => {
  Logger.info('Fetching user profile', { userId: user.id });

  try {
    // TODO: Fetch real user data from Supabase
    // For now, return mock data based on authenticated user
    const userData = {
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        roles: [{ role: 'admin' }],
        permissions: [
          'time_logging', 'reports', 'change_lead_reports', 'resource_management',
          'project_management', 'user_management', 'system_admin', 'dashboard',
          'calendar', 'submission_overview', 'settings', 'role_management'
        ],
        resource: { id: user.resourceId, name: 'Test User', role: 'Developer' }
      }
    };

    Logger.info('User profile fetched successfully', { userId: user.id });
    return res.json(userData);
  } catch (error) {
    Logger.error('Failed to fetch user profile', error, { userId: user.id });
    return createErrorResponse(res, 500, 'Failed to fetch user profile');
  }
};

// Export with middleware
module.exports = withMiddleware(meHandler, {
  requireAuth: true,
  allowedMethods: ['GET']
});
