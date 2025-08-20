// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Simplified login endpoint for debugging authentication issues
 * This bypasses the complex middleware to isolate token generation problems
 */
module.exports = async (req, res) => {
  try {
    console.log('[LOGIN_SIMPLE] Starting simplified login', {
      method: req.method,
      timestamp: new Date().toISOString(),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers['content-type']
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      console.log('[LOGIN_SIMPLE] Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('[LOGIN_SIMPLE] Method not allowed', { method: req.method });
      return res.status(405).json({
        error: true,
        message: `Method ${req.method} not allowed`,
        timestamp: new Date().toISOString()
      });
    }

    // Parse request body
    let email, password, rememberMe;
    
    if (req.body) {
      email = req.body.email;
      password = req.body.password;
      rememberMe = req.body.rememberMe || false;
    } else {
      console.error('[LOGIN_SIMPLE] No request body found');
      return res.status(400).json({
        error: true,
        message: 'Request body is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('[LOGIN_SIMPLE] Processing login request', {
      email,
      hasPassword: !!password,
      rememberMe
    });

    // Basic validation
    if (!email || !password) {
      console.warn('[LOGIN_SIMPLE] Missing email or password');
      return res.status(400).json({
        error: true,
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    // For development - accept any email/password combination
    console.log('[LOGIN_SIMPLE] Generating JWT tokens');

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

    // Test token immediately
    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET);
      console.log('[LOGIN_SIMPLE] Token verification successful', {
        userId: decoded.userId,
        email: decoded.email,
        hasRoles: !!decoded.roles,
        hasPermissions: !!decoded.permissions
      });
    } catch (tokenError) {
      console.error('[LOGIN_SIMPLE] Token verification failed', {
        error: tokenError.message
      });
    }

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
      tokens: { 
        accessToken, 
        refreshToken,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000))
      }
    };

    console.log('[LOGIN_SIMPLE] Login successful', {
      email,
      userId: 1,
      tokenLength: accessToken.length,
      expiresIn: rememberMe ? '30d' : '1d'
    });

    return res.status(200).json(userData);

  } catch (error) {
    console.error('[LOGIN_SIMPLE] Critical error in simplified login', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    try {
      return res.status(500).json({
        error: true,
        message: `Login failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } catch (responseError) {
      console.error('[LOGIN_SIMPLE] Failed to send error response', responseError);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Login failed: ${error.message}`);
    }
  }
};
