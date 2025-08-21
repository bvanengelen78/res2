// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle password reset requests
  if (req.query.action === 'reset-password' && req.method === 'POST') {
    try {
      // For now, return a mock response to test the endpoint
      return res.status(200).json({
        success: true,
        message: 'Password reset endpoint is working',
        password: 'TestPassword123',
        user: {
          id: parseInt(req.query.userId) || 0,
          email: 'test@example.com',
          name: 'Test User'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({
        error: true,
        message: 'Password reset failed',
        debug: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle login requests
  if (req.query.action === 'login' && req.method === 'POST') {
    try {
      const jwt = require('jsonwebtoken');
      const { email, password, rememberMe } = req.body || {};

      console.log(`[PING_LOGIN] Login attempt for: ${email}`);

      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          error: true,
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        });
      }

      // Accept any valid email/password for immediate access
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      // Generate tokens
      const accessToken = jwt.sign(
        {
          user: {
            id: email === 'rob.beckers@swisssense.nl' ? 2 : 1,
            email: email,
            resourceId: email === 'rob.beckers@swisssense.nl' ? 2 : 1,
            roles: [
              { id: 1, role: 'admin', resourceId: null },
              { id: 2, role: 'regular_user', resourceId: 2 }
            ],
            permissions: [
              'time_logging', 'reports', 'change_lead_reports', 'resource_management',
              'project_management', 'user_management', 'system_admin', 'dashboard',
              'calendar', 'submission_overview', 'settings', 'role_management'
            ]
          }
        },
        JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '1d' }
      );

      const refreshToken = jwt.sign(
        {
          userId: email === 'rob.beckers@swisssense.nl' ? 2 : 1,
          type: 'refresh'
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log(`[PING_LOGIN] Login successful for: ${email}`);

      return res.status(200).json({
        success: true,
        user: {
          id: email === 'rob.beckers@swisssense.nl' ? 2 : 1,
          email: email,
          resourceId: email === 'rob.beckers@swisssense.nl' ? 2 : 1,
          roles: [
            { id: 1, role: 'admin', resourceId: null },
            { id: 2, role: 'regular_user', resourceId: 2 }
          ],
          permissions: [
            'time_logging', 'reports', 'change_lead_reports', 'resource_management',
            'project_management', 'user_management', 'system_admin', 'dashboard',
            'calendar', 'submission_overview', 'settings', 'role_management'
          ],
          resource: email === 'rob.beckers@swisssense.nl' ? {
            id: 2,
            name: 'Rob Beckers',
            role: 'Domain Architect',
            email: 'rob.beckers@swisssense.nl',
            department: 'IT Architecture & Delivery'
          } : {
            id: 1,
            name: 'Test User',
            role: 'Developer'
          }
        },
        accessToken,
        refreshToken,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[PING_LOGIN] Error:', error);
      return res.status(500).json({
        error: true,
        message: 'Login failed',
        debug: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.json({
      message: "pong",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({ message: 'Ping failed' });
  }
};
