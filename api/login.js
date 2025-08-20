const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

// Main login handler
const loginHandler = async (req, res, { validatedData }) => {
  const { email, password, rememberMe } = validatedData;

  Logger.info('Login attempt', { email, rememberMe });

  try {
    // TODO: Replace with real authentication against Supabase
    // For now, accept any email/password for development
    if (email && password) {
      // Use consistent token format with Express.js server
      const accessToken = jwt.sign(
        {
          userId: 1,
          email: email,
          resourceId: 1,
          roles: ['admin'],
          permissions: [
            'time_logging', 'reports', 'change_lead_reports', 'resource_management',
            'project_management', 'user_management', 'system_admin', 'dashboard',
            'calendar', 'submission_overview', 'settings', 'role_management'
          ]
        },
        JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '1d' }
      );

      const refreshToken = jwt.sign(
        { userId: 1, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const userData = {
        user: {
          id: 1,
          email: email,
          resourceId: 1,
          roles: [{ role: 'admin' }],
          permissions: [
            'time_logging', 'reports', 'change_lead_reports', 'resource_management',
            'project_management', 'user_management', 'system_admin', 'dashboard',
            'calendar', 'submission_overview', 'settings', 'role_management'
          ],
          resource: { id: 1, name: 'Test User', role: 'Developer' }
        },
        tokens: { accessToken, refreshToken }
      };

      Logger.info('Login successful', { email, userId: 1 });
      return res.json(userData);
    } else {
      Logger.warn('Login failed - invalid credentials', { email });
      return createErrorResponse(res, 401, 'Invalid credentials');
    }
  } catch (error) {
    Logger.error('Login error', error, { email });
    return createErrorResponse(res, 500, 'Login failed');
  }
};

// Export with middleware
module.exports = withMiddleware(loginHandler, {
  requireAuth: false,
  allowedMethods: ['POST'],
  validateSchema: loginSchema
});
